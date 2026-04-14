export type Session = {
  id: string
  name?: string
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

export type CreateSessionParams = {
  name?: string
  procedure?: string
  parent_session_id?: string
  tags?: string[]
}

export type ResumeSessionParams = {
  session_id: string
  instruction: string
}

export type ISessionRepository = {
  save(session: Session): void
  load(sessionId: string): Session
  exists(sessionId: string): boolean
  delete(sessionId: string): Promise<void>
  list(): Session[]
  getPath(sessionId: string): string
}

export type ISessionDomain = {
  create(params: CreateSessionParams): Promise<Session>
  save(session: Session): Promise<void>
  get(sessionId: string): Promise<Session>
  getPath(sessionId: string): string
  list(): Promise<Session[]>
  delete(sessionId: string): Promise<void>
  updateStatus(sessionId: string, status: 'active' | 'completed' | 'failed'): Promise<Session>
  rename(sessionId: string, name: string): Promise<Session>
}

export type IImportDomain = {
  resolveWorkingDir(claudeSessionId: string): string
  validateSession(claudeSessionId: string, workingDir: string): void
}
