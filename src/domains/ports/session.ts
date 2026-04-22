import type { Session, CreateSessionParams, SweepFilter, ListFilter } from '@src/types/session'

export type ISessionDomain = {
  create(params: CreateSessionParams): Promise<Session>
  save(session: Session): Promise<void>
  get(sessionId: string): Promise<Session>
  getPath(sessionId: string): string
  list(filter?: ListFilter): Promise<Session[]>
  delete(sessionId: string): Promise<void>
  updateStatus(sessionId: string, status: 'active' | 'completed' | 'failed'): Promise<Session>
  rename(sessionId: string, name: string): Promise<Session>
  setLabels(sessionId: string, labels: string[]): Promise<Session>
  addLabels(sessionId: string, labels: string[]): Promise<Session>
  findByName(name: string): Promise<Session | null>
  resolveId(nameOrId: string): Promise<string>
  createRewind(
    originalSessionId: string,
    messageId: string | undefined,
    name?: string
  ): Promise<Session>
  sweep(filter: SweepFilter, dryRun: boolean): Promise<Session[]>
}

export type IImportDomain = {
  resolveWorkingDir(claudeSessionId: string): string
  validateSession(claudeSessionId: string, workingDir: string): void
}
