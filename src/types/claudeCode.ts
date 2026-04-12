import type { ThinkingBlock, ToolUseRecord } from './common.js'

export type StartAction = {
  type: 'start'
  sessionId: string
  prompt: string
  system?: string
  model?: string
  allowedTools?: string[]
  workingDir: string
  sessionFilePath?: string
}

export type ResumeAction = {
  type: 'resume'
  sessionId: string
  prompt: string
  model?: string
  allowedTools?: string[]
  workingDir: string
  sessionFilePath?: string
}

export type ClaudeAction = StartAction | ResumeAction

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
}

export type IClaudeCodeRepository = {
  dispatch(action: ClaudeAction): Promise<RawOutput>
}
