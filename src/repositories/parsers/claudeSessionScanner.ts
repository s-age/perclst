import type { AssistantTurnEntry, ClaudeCodeTurn, SessionStats } from '@src/types/analysis'
import type {
  RawUserEntry,
  RawAssistantEntry,
  RawContentBlock,
  RawEntry,
  TokenTotals
} from './claudeSessionParser'
import { mergeAssistantGroup } from './claudeSessionParser'

type TurnAccum = {
  turns: ClaudeCodeTurn[]
  pending: RawAssistantEntry[]
  totals: TokenTotals
  lastGroupTokens: TokenTotals | null
  toolResultMap: Map<string, { text: string | null; isError: boolean }>
}

function newTurnAccum(
  toolResultMap: Map<string, { text: string | null; isError: boolean }>
): TurnAccum {
  return {
    turns: [],
    pending: [],
    totals: { totalInput: 0, totalOutput: 0, totalCacheRead: 0, totalCacheCreation: 0 },
    lastGroupTokens: null,
    toolResultMap
  }
}

function flushPending(a: TurnAccum): void {
  if (a.pending.length === 0) return
  const merged = mergeAssistantGroup(a.pending, a.toolResultMap)
  if (merged) {
    a.turns.push(merged.turn)
    a.totals.totalInput += merged.tokens.totalInput
    a.totals.totalOutput += merged.tokens.totalOutput
    a.totals.totalCacheRead += merged.tokens.totalCacheRead
    a.totals.totalCacheCreation += merged.tokens.totalCacheCreation
    a.lastGroupTokens = merged.tokens
  }
  a.pending = []
}

function pushUserTurn(content: string | RawContentBlock[], turns: ClaudeCodeTurn[]): void {
  if (typeof content === 'string') {
    turns.push({ userMessage: content, toolCalls: [] })
  } else if (Array.isArray(content) && !content.some((b) => b.type === 'tool_result')) {
    const texts = content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map((b) => b.text)
    if (texts.length > 0) turns.push({ userMessage: texts.join('\n'), toolCalls: [] })
  }
}

function finalizeAccum(a: TurnAccum): {
  turns: ClaudeCodeTurn[]
  tokens: TokenTotals
  contextWindow: number
} {
  flushPending(a)
  const lgt = a.lastGroupTokens
  const contextWindow = lgt ? lgt.totalInput + lgt.totalCacheRead + lgt.totalCacheCreation : 0
  return { turns: a.turns, tokens: a.totals, contextWindow }
}

export function buildTurns(
  entries: RawEntry[],
  toolResultMap: Map<string, { text: string | null; isError: boolean }>
): { turns: ClaudeCodeTurn[]; tokens: TokenTotals; contextWindow: number } {
  const a = newTurnAccum(toolResultMap)
  for (const entry of entries) {
    if (entry.type === 'user') {
      flushPending(a)
      pushUserTurn((entry as RawUserEntry).message.content, a.turns)
    } else if (entry.type === 'assistant') {
      a.pending.push(entry as RawAssistantEntry)
    }
  }
  return finalizeAccum(a)
}

function extractToolResultText(content: string | RawContentBlock[]): string | null {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    const texts = content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map((b) => b.text)
    return texts.length > 0 ? texts.join('\n') : null
  }
  return null
}

function collectToolResults(
  entry: RawUserEntry,
  map: Map<string, { text: string | null; isError: boolean }>
): void {
  const content = entry.message.content
  if (!Array.isArray(content)) return
  for (const block of content) {
    if (block.type === 'tool_result') {
      map.set(block.tool_use_id, {
        text: extractToolResultText(block.content),
        isError: block.is_error ?? false
      })
    }
  }
}

export function readSessionFromRaw(
  raw: string,
  upToMessageId?: string
): { turns: ClaudeCodeTurn[]; tokens: TokenTotals; contextWindow: number } {
  const a = newTurnAccum(new Map())
  let cutoffReached = false

  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const entry = JSON.parse(trimmed) as RawEntry

    if (entry.type === 'user') {
      collectToolResults(entry as RawUserEntry, a.toolResultMap)
      flushPending(a)
      if (cutoffReached) break
      pushUserTurn((entry as RawUserEntry).message.content, a.turns)
    } else if (entry.type === 'assistant') {
      if (cutoffReached) continue
      const ae = entry as RawAssistantEntry
      a.pending.push(ae)
      if (upToMessageId && ae.uuid === upToMessageId) cutoffReached = true
    }
  }
  return finalizeAccum(a)
}

export function extractAssistantTurnsFromRaw(raw: string): AssistantTurnEntry[] {
  const result: AssistantTurnEntry[] = []
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const entry = JSON.parse(trimmed) as RawEntry
    if (entry.type !== 'assistant') continue
    const ae = entry as RawAssistantEntry
    const content = ae.message.content ?? []
    if (content.length > 0 && content.every((b) => b.type === 'thinking')) continue
    const text = content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map((b) => b.text)
      .join(' ')
      .trim()
    if (!text) continue
    result.push({ uuid: ae.uuid, text })
  }
  return result
}

export function computeMessagesTotalFromContent(content: string): number {
  if (!content.trim()) return 0

  let total = 0
  let groupActive = false
  let groupHasContent = false
  let groupToolCount = 0

  const flushGroup = (): void => {
    if (groupActive && groupHasContent) {
      total++ // assistant turn
      total += groupToolCount * 2 // tool_use + tool_result pairs
    }
    groupActive = false
    groupHasContent = false
    groupToolCount = 0
  }

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const entry = JSON.parse(trimmed) as RawEntry
    if (entry.type === 'user') {
      flushGroup()
      const userContent = (entry as RawUserEntry).message.content
      if (typeof userContent === 'string') {
        total++
      } else if (Array.isArray(userContent) && !userContent.some((b) => b.type === 'tool_result')) {
        if (userContent.some((b) => b.type === 'text')) total++
      }
    } else if (entry.type === 'assistant') {
      if (!groupActive) {
        groupActive = true
        groupHasContent = false
        groupToolCount = 0
      }
      for (const block of (entry as RawAssistantEntry).message.content ?? []) {
        if (block.type === 'text' || block.type === 'tool_use') {
          groupHasContent = true
          if (block.type === 'tool_use') groupToolCount++
        }
      }
    }
  }
  flushGroup()
  return total
}

type ScanGroup = { active: boolean; hasContent: boolean; toolCount: number; tokens: TokenTotals }
type ScanAccum = { apiCalls: number; toolCalls: number; tokens: TokenTotals; contextWindow: number }

const zeroTokens = (): TokenTotals => ({
  totalInput: 0,
  totalOutput: 0,
  totalCacheRead: 0,
  totalCacheCreation: 0
})

function flushScanGroup(g: ScanGroup, a: ScanAccum): void {
  if (!g.active) return
  if (g.hasContent) {
    a.apiCalls++
    a.toolCalls += g.toolCount
    a.tokens.totalInput += g.tokens.totalInput
    a.tokens.totalOutput += g.tokens.totalOutput
    a.tokens.totalCacheRead += g.tokens.totalCacheRead
    a.tokens.totalCacheCreation += g.tokens.totalCacheCreation
    a.contextWindow = g.tokens.totalInput + g.tokens.totalCacheRead + g.tokens.totalCacheCreation
  }
  g.active = false
  g.hasContent = false
  g.toolCount = 0
  g.tokens = zeroTokens()
}

function processScanAssistant(ae: RawAssistantEntry, g: ScanGroup): void {
  if (!g.active) {
    g.active = true
    g.hasContent = false
    g.toolCount = 0
    g.tokens = zeroTokens()
  }
  for (const block of ae.message.content ?? []) {
    if (block.type === 'text' || block.type === 'tool_use') {
      g.hasContent = true
      if (block.type === 'tool_use') g.toolCount++
    }
  }
  // Overwrite rather than accumulate — same deduplication as mergeAssistantGroup
  const u = ae.message.usage
  if (u) {
    g.tokens = {
      totalInput: u.input_tokens ?? 0,
      totalOutput: u.output_tokens ?? 0,
      totalCacheRead: u.cache_read_input_tokens ?? 0,
      totalCacheCreation: u.cache_creation_input_tokens ?? 0
    }
  }
}

export function scanStats(raw: string, upToMessageId?: string): SessionStats {
  const a: ScanAccum = { apiCalls: 0, toolCalls: 0, tokens: zeroTokens(), contextWindow: 0 }
  const g: ScanGroup = { active: false, hasContent: false, toolCount: 0, tokens: zeroTokens() }
  let cutoffReached = false

  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const entry = JSON.parse(trimmed) as RawEntry

    if (entry.type === 'user') {
      flushScanGroup(g, a)
      if (cutoffReached) break
    } else if (entry.type === 'assistant') {
      if (cutoffReached) continue
      const ae = entry as RawAssistantEntry
      processScanAssistant(ae, g)
      if (upToMessageId && ae.uuid === upToMessageId) cutoffReached = true
    }
  }
  flushScanGroup(g, a)

  return {
    apiCalls: a.apiCalls,
    toolCalls: a.toolCalls,
    tokens: { ...a.tokens, contextWindow: a.contextWindow }
  }
}
