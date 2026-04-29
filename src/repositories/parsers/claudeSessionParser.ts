import type { ClaudeCodeTurn, SessionStats, ToolCall } from '@src/types/analysis'

export type RawUserEntry = {
  type: 'user'
  message: {
    content: string | RawContentBlock[]
  }
}

export type RawAssistantEntry = {
  type: 'assistant'
  uuid: string
  message: {
    content: RawContentBlock[]
    usage?: {
      input_tokens?: number
      output_tokens?: number
      cache_read_input_tokens?: number
      cache_creation_input_tokens?: number
    }
  }
}

export type RawContentBlock =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | {
      type: 'tool_result'
      tool_use_id: string
      content: string | RawContentBlock[]
      is_error?: boolean
    }
  | { type: 'tool_reference'; id: string }

export type RawEntry = RawUserEntry | RawAssistantEntry | { type: string }

export type TokenTotals = {
  totalInput: number
  totalOutput: number
  totalCacheRead: number
  totalCacheCreation: number
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

export function parseRawEntries(raw: string): RawEntry[] {
  return raw
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as RawEntry)
}

export function buildToolResultMap(
  entries: RawEntry[]
): Map<string, { text: string | null; isError: boolean }> {
  const map = new Map<string, { text: string | null; isError: boolean }>()
  for (const entry of entries) {
    if (entry.type !== 'user') continue
    const userEntry = entry as RawUserEntry
    const content = userEntry.message.content
    if (!Array.isArray(content)) continue
    for (const block of content) {
      if (block.type === 'tool_result') {
        map.set(block.tool_use_id, {
          text: extractToolResultText(block.content),
          isError: block.is_error ?? false
        })
      }
    }
  }
  return map
}

export function processAssistantEntry(
  entry: RawAssistantEntry,
  toolResultMap: Map<string, { text: string | null; isError: boolean }>
): { turn: ClaudeCodeTurn; tokenDeltas: TokenTotals } | null {
  const content = entry.message.content ?? []
  if (content.length > 0 && content.every((b) => b.type === 'thinking')) return null

  const thinkingBlocks: string[] = []
  const toolCalls: ToolCall[] = []
  let assistantText: string | undefined

  for (const block of content) {
    if (block.type === 'thinking') {
      thinkingBlocks.push(block.thinking)
    } else if (block.type === 'text') {
      assistantText = (assistantText ?? '') + block.text
    } else if (block.type === 'tool_use') {
      const mapped = toolResultMap.get(block.id)
      toolCalls.push({
        name: block.name,
        input: block.input,
        result: mapped?.text ?? null,
        isError: mapped?.isError ?? false
      })
    }
  }

  const u = entry.message.usage
  const inp = u?.input_tokens ?? 0
  const out = u?.output_tokens ?? 0
  const cr = u?.cache_read_input_tokens ?? 0
  const cc = u?.cache_creation_input_tokens ?? 0
  const usage: ClaudeCodeTurn['usage'] | undefined = u
    ? {
        input_tokens: inp,
        output_tokens: out,
        cache_read_input_tokens: cr,
        cache_creation_input_tokens: cc
      }
    : undefined

  return {
    turn: {
      toolCalls,
      assistantText: assistantText?.trim() || undefined,
      thinkingBlocks: thinkingBlocks.length > 0 ? thinkingBlocks : undefined,
      usage
    },
    tokenDeltas: { totalInput: inp, totalOutput: out, totalCacheRead: cr, totalCacheCreation: cc }
  }
}

type MergeAccumulator = {
  thinking: string[]
  toolCalls: ToolCall[]
  text: string | undefined
  usage: ClaudeCodeTurn['usage'] | undefined
  tokens: TokenTotals
}

function mergeAssistantGroup(
  pending: RawAssistantEntry[],
  toolResultMap: Map<string, { text: string | null; isError: boolean }>
): { turn: ClaudeCodeTurn; tokens: TokenTotals } | null {
  const acc: MergeAccumulator = {
    thinking: [],
    toolCalls: [],
    text: undefined,
    usage: undefined,
    tokens: { totalInput: 0, totalOutput: 0, totalCacheRead: 0, totalCacheCreation: 0 }
  }

  for (const e of pending) {
    // Extract thinking from all entries, including thinking-only ones that processAssistantEntry skips.
    for (const block of e.message.content ?? []) {
      if (block.type === 'thinking') acc.thinking.push(block.thinking)
    }
    const result = processAssistantEntry(e, toolResultMap)
    if (!result) continue
    // thinkingBlocks already collected above; only take text, tools, usage, and tokens.
    if (result.turn.assistantText)
      acc.text =
        acc.text !== undefined ? acc.text + result.turn.assistantText : result.turn.assistantText
    acc.toolCalls.push(...result.turn.toolCalls)
    if (result.turn.usage) acc.usage = result.turn.usage
    // Claude Code writes the same API-call usage to every content-block entry in the group
    // (thinking, text, tool_use all share identical usage fields). Overwrite rather than
    // accumulate so the usage is counted exactly once per API call.
    acc.tokens = result.tokenDeltas
  }

  if (acc.text === undefined && acc.toolCalls.length === 0) return null
  return {
    turn: {
      toolCalls: acc.toolCalls,
      assistantText: acc.text?.trim() || undefined,
      thinkingBlocks: acc.thinking.length > 0 ? acc.thinking : undefined,
      usage: acc.usage
    },
    tokens: acc.tokens
  }
}

// Claude Code emits thinking/text/tool_use as separate JSONL entries.
// Buffer consecutive assistant entries and flush them as a single logical turn
// when a user entry (or end-of-stream) is reached.
export function buildTurns(
  entries: RawEntry[],
  toolResultMap: Map<string, { text: string | null; isError: boolean }>
): { turns: ClaudeCodeTurn[]; tokens: TokenTotals; contextWindow: number } {
  const turns: ClaudeCodeTurn[] = []
  let totalInput = 0
  let totalOutput = 0
  let totalCacheRead = 0
  let totalCacheCreation = 0
  let pending: RawAssistantEntry[] = []
  let lastGroupTokens: TokenTotals | null = null

  const flush = (): void => {
    if (pending.length === 0) return
    const merged = mergeAssistantGroup(pending, toolResultMap)
    if (merged) {
      turns.push(merged.turn)
      totalInput += merged.tokens.totalInput
      totalOutput += merged.tokens.totalOutput
      totalCacheRead += merged.tokens.totalCacheRead
      totalCacheCreation += merged.tokens.totalCacheCreation
      lastGroupTokens = merged.tokens
    }
    pending = []
  }

  for (const entry of entries) {
    if (entry.type === 'user') {
      flush()
      const content = (entry as RawUserEntry).message.content
      if (typeof content === 'string') {
        turns.push({ userMessage: content, toolCalls: [] })
      } else if (Array.isArray(content) && !content.some((b) => b.type === 'tool_result')) {
        const texts = content
          .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
          .map((b) => b.text)
        if (texts.length > 0) turns.push({ userMessage: texts.join('\n'), toolCalls: [] })
      }
    } else if (entry.type === 'assistant') {
      pending.push(entry as RawAssistantEntry)
    }
  }
  flush()

  const lgt = lastGroupTokens as TokenTotals | null
  const contextWindow = lgt ? lgt.totalInput + lgt.totalCacheRead + lgt.totalCacheCreation : 0
  return {
    turns,
    tokens: { totalInput, totalOutput, totalCacheRead, totalCacheCreation },
    contextWindow
  }
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
    // Parse one entry at a time — object is not stored, eligible for GC after each iteration
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

export function filterEntriesUpTo(entries: RawEntry[], messageId: string): RawEntry[] {
  const cutoffIdx = entries.findIndex(
    (e) => e.type === 'assistant' && (e as RawAssistantEntry).uuid === messageId
  )
  if (cutoffIdx === -1) return entries
  // Include the tool_result user entry immediately following the cutoff, if present
  let end = cutoffIdx + 1
  if (end < entries.length && entries[end].type === 'user') {
    const content = (entries[end] as RawUserEntry).message.content
    if (Array.isArray(content) && content.some((b) => b.type === 'tool_result')) {
      end++
    }
  }
  return entries.slice(0, end)
}
