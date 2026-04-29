import type { AssistantTurnEntry, ClaudeCodeTurn, SessionStats } from '@src/types/analysis'
import type {
  RawUserEntry,
  RawAssistantEntry,
  RawContentBlock,
  RawEntry,
  TokenTotals
} from './claudeSessionParser'
import { mergeAssistantGroup } from './claudeSessionParser'
import {
  createStatsScanState as _createStatsScanState,
  processStatsScanLine as _processStatsScanLine,
  finalizeStatsScan as _finalizeStatsScan
} from './claudeStatsScanParser'
export type { StatsScanState } from './claudeStatsScanParser'
export {
  createStatsScanState,
  processStatsScanLine,
  finalizeStatsScan
} from './claudeStatsScanParser'

// ─── Shared helpers ──────────────────────────────────────────────────────────

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

// ─── buildTurns (pre-parsed RawEntry[]) ──────────────────────────────────────

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

// ─── Session read state machine ──────────────────────────────────────────────

export type SessionReadState = TurnAccum & {
  upToMessageId: string | undefined
  cutoffReached: boolean
}

export function createSessionReadState(upToMessageId?: string): SessionReadState {
  return {
    ...newTurnAccum(new Map()),
    upToMessageId,
    cutoffReached: false
  }
}

export function processSessionReadLine(state: SessionReadState, line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  const entry = JSON.parse(trimmed) as RawEntry

  if (entry.type === 'user') {
    collectToolResults(entry as RawUserEntry, state.toolResultMap)
    flushPending(state)
    if (state.cutoffReached) return true
    pushUserTurn((entry as RawUserEntry).message.content, state.turns)
  } else if (entry.type === 'assistant') {
    if (state.cutoffReached) return false
    const ae = entry as RawAssistantEntry
    state.pending.push(ae)
    if (state.upToMessageId && ae.uuid === state.upToMessageId) state.cutoffReached = true
  }
  return false
}

export function finalizeSessionRead(state: SessionReadState): {
  turns: ClaudeCodeTurn[]
  tokens: TokenTotals
  contextWindow: number
} {
  return finalizeAccum(state)
}

// ─── Assistant turn scan state machine ───────────────────────────────────────

export type AssistantTurnState = {
  result: AssistantTurnEntry[]
}

export function createAssistantTurnState(): AssistantTurnState {
  return { result: [] }
}

export function processAssistantTurnLine(state: AssistantTurnState, line: string): void {
  const trimmed = line.trim()
  if (!trimmed) return
  const entry = JSON.parse(trimmed) as RawEntry
  if (entry.type !== 'assistant') return
  const ae = entry as RawAssistantEntry
  const content = ae.message.content ?? []
  if (content.length > 0 && content.every((b) => b.type === 'thinking')) return
  const text = content
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map((b) => b.text)
    .join(' ')
    .trim()
  if (!text) return
  state.result.push({ uuid: ae.uuid, text })
}

export function finalizeAssistantTurns(state: AssistantTurnState): AssistantTurnEntry[] {
  return state.result
}

// ─── Message count state machine ─────────────────────────────────────────────

export type MessageCountState = {
  total: number
  groupActive: boolean
  groupHasContent: boolean
  groupToolCount: number
}

export function createMessageCountState(): MessageCountState {
  return { total: 0, groupActive: false, groupHasContent: false, groupToolCount: 0 }
}

function flushMessageGroup(s: MessageCountState): void {
  if (s.groupActive && s.groupHasContent) {
    s.total++
    s.total += s.groupToolCount * 2
  }
  s.groupActive = false
  s.groupHasContent = false
  s.groupToolCount = 0
}

export function processMessageCountLine(state: MessageCountState, line: string): void {
  const trimmed = line.trim()
  if (!trimmed) return
  const entry = JSON.parse(trimmed) as RawEntry
  if (entry.type === 'user') {
    flushMessageGroup(state)
    const userContent = (entry as RawUserEntry).message.content
    if (typeof userContent === 'string') {
      state.total++
    } else if (Array.isArray(userContent) && !userContent.some((b) => b.type === 'tool_result')) {
      if (userContent.some((b) => b.type === 'text')) state.total++
    }
  } else if (entry.type === 'assistant') {
    if (!state.groupActive) {
      state.groupActive = true
      state.groupHasContent = false
      state.groupToolCount = 0
    }
    for (const block of (entry as RawAssistantEntry).message.content ?? []) {
      if (block.type === 'text' || block.type === 'tool_use') {
        state.groupHasContent = true
        if (block.type === 'tool_use') state.groupToolCount++
      }
    }
  }
}

export function finalizeMessageCount(state: MessageCountState): number {
  flushMessageGroup(state)
  return state.total
}

// ─── Legacy wrappers (used by tests and agentRepository) ─────────────────────

export function readSessionFromRaw(
  raw: string,
  upToMessageId?: string
): { turns: ClaudeCodeTurn[]; tokens: TokenTotals; contextWindow: number } {
  const state = createSessionReadState(upToMessageId)
  for (const line of raw.split('\n')) {
    if (processSessionReadLine(state, line)) break
  }
  return finalizeSessionRead(state)
}

export function extractAssistantTurnsFromRaw(raw: string): AssistantTurnEntry[] {
  const state = createAssistantTurnState()
  for (const line of raw.split('\n')) processAssistantTurnLine(state, line)
  return finalizeAssistantTurns(state)
}

export function computeMessagesTotalFromContent(content: string): number {
  if (!content.trim()) return 0
  const state = createMessageCountState()
  for (const line of content.split('\n')) processMessageCountLine(state, line)
  return finalizeMessageCount(state)
}

export function scanStats(raw: string, upToMessageId?: string): SessionStats {
  const state = _createStatsScanState(upToMessageId)
  for (const line of raw.split('\n')) {
    if (_processStatsScanLine(state, line)) break
  }
  return _finalizeStatsScan(state)
}
