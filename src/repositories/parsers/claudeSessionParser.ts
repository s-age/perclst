import type { AnalysisSummary, ClaudeCodeTurn, ToolCall } from '@src/types/analysis'

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

export function buildTurns(
  entries: RawEntry[],
  toolResultMap: Map<string, { text: string | null; isError: boolean }>
): { turns: ClaudeCodeTurn[]; tokens: TokenTotals } {
  const turns: ClaudeCodeTurn[] = []
  let totalInput = 0
  let totalOutput = 0
  let totalCacheRead = 0
  let totalCacheCreation = 0

  for (const entry of entries) {
    if (entry.type === 'user') {
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
      const result = processAssistantEntry(entry as RawAssistantEntry, toolResultMap)
      if (result) {
        turns.push(result.turn)
        totalInput += result.tokenDeltas.totalInput
        totalOutput += result.tokenDeltas.totalOutput
        totalCacheRead += result.tokenDeltas.totalCacheRead
        totalCacheCreation += result.tokenDeltas.totalCacheCreation
      }
    }
  }

  return { turns, tokens: { totalInput, totalOutput, totalCacheRead, totalCacheCreation } }
}

export function buildSummaryStats(turns: ClaudeCodeTurn[]): {
  turnsBreakdown: AnalysisSummary['turnsBreakdown']
  toolUses: AnalysisSummary['toolUses']
} {
  let userInstructions = 0
  let toolUse = 0
  let assistantResponse = 0
  const allToolUses: AnalysisSummary['toolUses'] = []

  for (const turn of turns) {
    if (turn.userMessage !== undefined) userInstructions++
    if (turn.assistantText !== undefined || turn.toolCalls.length > 0) assistantResponse++
    toolUse += turn.toolCalls.length
    for (const tc of turn.toolCalls) {
      allToolUses.push({ name: tc.name, input: tc.input, isError: tc.isError })
    }
  }

  return {
    turnsBreakdown: {
      userInstructions,
      toolUse,
      assistantResponse,
      total: userInstructions + toolUse * 2 + assistantResponse
    },
    toolUses: allToolUses
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
