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
  thoughts?: ThinkingBlock[]
  tool_history?: ToolUseRecord[]
}
