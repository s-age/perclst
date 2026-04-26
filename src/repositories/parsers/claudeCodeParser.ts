import type { ThinkingBlock, ToolUseRecord } from '@src/types/common'
import type { RawOutput } from '@src/types/claudeCode'
import type { AgentStreamEvent } from '@src/types/agent'
import { MCP_SERVER_NAME } from '@src/constants/config'

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: unknown }

type StreamEvent = {
  type: 'assistant' | 'user' | 'system' | 'result'
  subtype?: string
  parent_tool_use_id?: string
  message?: {
    role: string
    content: ContentBlock[]
    usage?: {
      input_tokens: number
      output_tokens: number
      cache_read_input_tokens?: number
      cache_creation_input_tokens?: number
    }
  }
  result?: string
  usage?: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens?: number
    cache_creation_input_tokens?: number
  }
}

export type ParseState = {
  thoughts: ThinkingBlock[]
  toolMap: Map<string, ToolUseRecord>
  permissionToolIds: Set<string>
  finalContent: string
  usage: RawOutput['usage']
  lastAssistantUsage: RawOutput['last_assistant_usage'] | undefined
  assistantEventCount: number
  userToolResultEventCount: number
  toolCallCount: number
}

const MAX_HISTORY_ENTRIES = 200

const PERMISSION_TOOL_NAME = `mcp__${MCP_SERVER_NAME}__ask_permission`

function evictOldest(map: Map<string, ToolUseRecord>): void {
  const firstKey = map.keys().next().value
  if (firstKey !== undefined) map.delete(firstKey)
}

function processAssistantEvent(event: StreamEvent, state: ParseState): void {
  if (!event.message) return
  if (event.message.usage) {
    state.lastAssistantUsage = {
      input_tokens: event.message.usage.input_tokens,
      output_tokens: event.message.usage.output_tokens,
      cache_read_input_tokens: event.message.usage.cache_read_input_tokens,
      cache_creation_input_tokens: event.message.usage.cache_creation_input_tokens
    }
  }
  let hasCountableContent = false
  for (const block of event.message.content) {
    if (block.type === 'thinking') {
      state.thoughts.push({ type: 'thinking', thinking: block.thinking })
      if (state.thoughts.length > MAX_HISTORY_ENTRIES) state.thoughts.shift()
    } else if (block.type === 'tool_use') {
      if (block.name === PERMISSION_TOOL_NAME) {
        state.permissionToolIds.add(block.id)
      } else {
        state.toolMap.set(block.id, { id: block.id, name: block.name, input: block.input })
        if (state.toolMap.size > MAX_HISTORY_ENTRIES) evictOldest(state.toolMap)
        state.toolCallCount++
        hasCountableContent = true
      }
    } else {
      hasCountableContent = true
    }
  }
  if (hasCountableContent) state.assistantEventCount++
}

function processUserEvent(event: StreamEvent, state: ParseState): void {
  if (!event.message) return
  let hasRealToolResult = false
  for (const block of event.message.content) {
    if (block.type === 'tool_result') {
      if (state.permissionToolIds.has(block.tool_use_id)) continue
      hasRealToolResult = true
      const record = state.toolMap.get(block.tool_use_id)
      if (record) {
        record.result =
          typeof block.content === 'string' ? block.content : JSON.stringify(block.content, null, 2)
      }
    }
  }
  if (hasRealToolResult) state.userToolResultEventCount++
}

type RawContentBlock = {
  type: string
  thinking?: string
  name?: string
  id?: string
  input?: unknown
  tool_use_id?: string
  content?: unknown
}

type RawStreamEvent = {
  type: string
  message?: { content: RawContentBlock[] }
}

export function emitStreamEvents(
  line: string,
  toolNameMap: Map<string, string>,
  onStreamEvent: (event: AgentStreamEvent) => void
): void {
  const trimmed = line.trim()
  if (!trimmed) return
  let raw: RawStreamEvent
  try {
    raw = JSON.parse(trimmed) as RawStreamEvent
  } catch {
    return
  }
  if (!raw.message?.content) return

  if (raw.type === 'assistant') {
    for (const block of raw.message.content) {
      if (block.type === 'thinking' && block.thinking !== undefined) {
        onStreamEvent({ type: 'thought', thinking: block.thinking })
      } else if (block.type === 'tool_use' && block.name && block.name !== PERMISSION_TOOL_NAME) {
        if (block.id) toolNameMap.set(block.id, block.name)
        onStreamEvent({ type: 'tool_use', name: block.name, input: block.input ?? {} })
      }
    }
  } else if (raw.type === 'user') {
    for (const block of raw.message.content) {
      if (block.type === 'tool_result' && block.tool_use_id) {
        const toolName = toolNameMap.get(block.tool_use_id) ?? '?'
        if (toolName === '?') return
        const result =
          typeof block.content === 'string' ? block.content : JSON.stringify(block.content, null, 2)
        onStreamEvent({ type: 'tool_result', toolName, result })
      }
    }
  }
}

export function createParseState(): ParseState {
  return {
    thoughts: [],
    toolMap: new Map(),
    permissionToolIds: new Set(),
    finalContent: '',
    usage: { input_tokens: 0, output_tokens: 0 },
    lastAssistantUsage: undefined,
    assistantEventCount: 0,
    userToolResultEventCount: 0,
    toolCallCount: 0
  }
}

export function processLine(state: ParseState, line: string): void {
  const trimmed = line.trim()
  if (!trimmed) return
  let event: StreamEvent
  try {
    event = JSON.parse(trimmed) as StreamEvent
  } catch {
    return
  }
  if (event.type === 'assistant') processAssistantEvent(event, state)
  else if (event.type === 'user') processUserEvent(event, state)
  else if (event.type === 'result') {
    state.finalContent = event.result ?? ''
    if (event.usage) {
      state.usage = {
        input_tokens: event.usage.input_tokens,
        output_tokens: event.usage.output_tokens,
        cache_read_input_tokens: event.usage.cache_read_input_tokens,
        cache_creation_input_tokens: event.usage.cache_creation_input_tokens
      }
    }
  }
}

export function finalizeParseState(state: ParseState, jsonlBaseline: number): RawOutput {
  const messageCount =
    jsonlBaseline + 1 + state.assistantEventCount + state.userToolResultEventCount
  return {
    content: state.finalContent,
    thoughts: state.thoughts,
    tool_history: Array.from(state.toolMap.values()),
    usage: state.usage,
    last_assistant_usage: state.lastAssistantUsage,
    message_count: messageCount
  }
}

export function parseStreamEvents(lines: string[], jsonlBaseline: number): RawOutput {
  const state = createParseState()
  for (const line of lines) processLine(state, line)
  return finalizeParseState(state, jsonlBaseline)
}
