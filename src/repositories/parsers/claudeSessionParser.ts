import type { ClaudeCodeTurn, ToolCall } from '@src/types/analysis'

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
