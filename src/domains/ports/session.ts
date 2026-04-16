import type { Session, CreateSessionParams } from '@src/types/session'

export type ISessionDomain = {
  create(params: CreateSessionParams): Promise<Session>
  save(session: Session): Promise<void>
  get(sessionId: string): Promise<Session>
  getPath(sessionId: string): string
  list(): Promise<Session[]>
  delete(sessionId: string): Promise<void>
  updateStatus(sessionId: string, status: 'active' | 'completed' | 'failed'): Promise<Session>
  rename(sessionId: string, name: string): Promise<Session>
  findByName(name: string): Promise<Session | null>
}

export type IImportDomain = {
  resolveWorkingDir(claudeSessionId: string): string
  validateSession(claudeSessionId: string, workingDir: string): void
}
