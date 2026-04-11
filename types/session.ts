import type { ThinkingBlock, ToolUseRecord } from './common.js'

export interface Session {
  id: string
  created_at: string
  updated_at: string
  procedure?: string

  metadata: {
    parent_session_id?: string
    tags: string[]
    status: 'active' | 'completed' | 'failed'
  }

  turns: Turn[]
  summary?: string
}

export interface Turn {
  role: 'user' | 'assistant'
  content: string
  timestamp: string

  model?: string
  usage?: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens?: number
    cache_creation_input_tokens?: number
  }
  thoughts?: ThinkingBlock[]
  tool_history?: ToolUseRecord[]
}

export interface CreateSessionParams {
  task: string
  procedure?: string
  parent_session_id?: string
  tags?: string[]
}

export interface ResumeSessionParams {
  session_id: string
  instruction: string
}
