import type { SessionStats } from '@src/types/analysis'
import type { RawAssistantEntry, RawEntry, TokenTotals } from './claudeSessionParser'

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

export type StatsScanState = {
  accum: ScanAccum
  group: ScanGroup
  upToMessageId: string | undefined
  cutoffReached: boolean
}

export function createStatsScanState(upToMessageId?: string): StatsScanState {
  return {
    accum: { apiCalls: 0, toolCalls: 0, tokens: zeroTokens(), contextWindow: 0 },
    group: { active: false, hasContent: false, toolCount: 0, tokens: zeroTokens() },
    upToMessageId,
    cutoffReached: false
  }
}

export function processStatsScanLine(state: StatsScanState, line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  const entry = JSON.parse(trimmed) as RawEntry

  if (entry.type === 'user') {
    flushScanGroup(state.group, state.accum)
    if (state.cutoffReached) return true
  } else if (entry.type === 'assistant') {
    if (state.cutoffReached) return false
    const ae = entry as RawAssistantEntry
    processScanAssistant(ae, state.group)
    if (state.upToMessageId && ae.uuid === state.upToMessageId) state.cutoffReached = true
  }
  return false
}

export function finalizeStatsScan(state: StatsScanState): SessionStats {
  flushScanGroup(state.group, state.accum)
  return {
    apiCalls: state.accum.apiCalls,
    toolCalls: state.accum.toolCalls,
    tokens: { ...state.accum.tokens, contextWindow: state.accum.contextWindow }
  }
}
