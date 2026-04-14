import type { ThinkingBlock, ToolUseRecord } from './common.js'
import type { Session } from './session.js'

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

export type IAgentDomain = {
  run(
    session: Session,
    instruction: string,
    isResume: boolean,
    options?: ExecuteOptions
  ): Promise<AgentResponse>
}

export type IProcedureRepository = {
  load(name: string): string
  exists(name: string): boolean
}
