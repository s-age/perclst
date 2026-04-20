export type Session = {
  id: string
  name?: string
  created_at: string
  updated_at: string
  procedure?: string
  claude_session_id: string
  working_dir: string
  rewind_source_claude_session_id?: string
  rewind_to_message_id?: string

  metadata: {
    parent_session_id?: string
    tags: string[]
    status: 'active' | 'completed' | 'failed'
  }
}

export type CreateSessionParams = {
  name?: string
  procedure?: string
  parent_session_id?: string
  tags?: string[]
  working_dir: string
}

export type ResumeSessionParams = {
  session_id: string
  instruction: string
}
