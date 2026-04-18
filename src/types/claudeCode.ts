import type { ThinkingBlock, ToolUseRecord } from './common.js'

export type StartAction = {
  type: 'start'
  sessionId: string
  prompt: string
  system?: string
  model?: string
  allowedTools?: string[]
  disallowedTools?: string[]
  workingDir: string
  sessionFilePath?: string
}

export type ResumeAction = {
  type: 'resume'
  sessionId: string
  prompt: string
  model?: string
  allowedTools?: string[]
  disallowedTools?: string[]
  workingDir: string
  sessionFilePath?: string
}

export type ForkAction = {
  type: 'fork'
  originalClaudeSessionId: string
  originalWorkingDir: string
  sessionId: string
  prompt: string
  resumeSessionAt?: string
  model?: string
  allowedTools?: string[]
  disallowedTools?: string[]
  workingDir: string
  sessionFilePath?: string
}

export type ClaudeAction = StartAction | ResumeAction | ForkAction

export type RawOutput = {
  content: string
  thoughts: ThinkingBlock[]
  tool_history: ToolUseRecord[]
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
  message_count: number
}
