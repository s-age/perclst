export interface Session {
  id: string
  created_at: string
  updated_at: string
  procedure?: string
  claude_session_id: string
  working_dir: string

  metadata: {
    parent_session_id?: string
    tags: string[]
    status: 'active' | 'completed' | 'failed'
  }
}

export interface CreateSessionParams {
  procedure?: string
  parent_session_id?: string
  tags?: string[]
}

export interface ResumeSessionParams {
  session_id: string
  instruction: string
}
