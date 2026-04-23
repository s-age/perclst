import type { ThinkingBlock, ToolUseRecord } from './common.js'

export type AgentResponse = {
  content: string
  model: string
  usage: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens?: number
    cache_creation_input_tokens?: number
  }
  last_assistant_usage?: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens?: number
    cache_creation_input_tokens?: number
  }
  message_count?: number
  thoughts?: ThinkingBlock[]
  tool_history?: ToolUseRecord[]
}

export type AgentStreamEvent =
  | { type: 'thought'; thinking: string }
  | { type: 'tool_use'; name: string; input: unknown }
  | { type: 'tool_result'; toolName: string; result: string }

export type ExecuteOptions = {
  allowedTools?: string[]
  disallowedTools?: string[]
  model?: string
  sessionFilePath?: string
  resumeSessionAt?: string
  onStreamEvent?: (event: AgentStreamEvent) => void
  signal?: AbortSignal
}

export type AgentRunOptions = {
  allowedTools?: string[]
  disallowedTools?: string[]
  model?: string
  maxTurns?: number
  maxContextTokens?: number
  onStreamEvent?: (event: AgentStreamEvent) => void
}
