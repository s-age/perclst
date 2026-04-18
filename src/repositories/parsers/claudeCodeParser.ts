import type { ThinkingBlock, ToolUseRecord } from '@src/types/common'
import type { RawOutput } from '@src/types/claudeCode'
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

type ParseState = {
  thoughts: ThinkingBlock[]
  toolMap: Map<string, ToolUseRecord>
  permissionToolIds: Set<string>
  finalContent: string
  usage: RawOutput['usage']
  lastAssistantUsage: RawOutput['last_assistant_usage'] | undefined
  assistantEventCount: number
  userToolResultEventCount: number
}

const PERMISSION_TOOL_NAME = `mcp__${MCP_SERVER_NAME}__ask_permission`

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
    } else if (block.type === 'tool_use') {
      if (block.name === PERMISSION_TOOL_NAME) {
        state.permissionToolIds.add(block.id)
      } else {
        state.toolMap.set(block.id, { id: block.id, name: block.name, input: block.input })
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

export function parseStreamEvents(lines: string[], jsonlBaseline: number): RawOutput {
  const state: ParseState = {
    thoughts: [],
    toolMap: new Map(),
    permissionToolIds: new Set(),
    finalContent: '',
    usage: { input_tokens: 0, output_tokens: 0 },
    lastAssistantUsage: undefined,
    assistantEventCount: 0,
    userToolResultEventCount: 0
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    let event: StreamEvent
    try {
      event = JSON.parse(trimmed) as StreamEvent
    } catch {
      continue
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
