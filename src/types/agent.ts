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

export type ExecuteOptions = {
  allowedTools?: string[]
  model?: string
  sessionFilePath?: string
}
