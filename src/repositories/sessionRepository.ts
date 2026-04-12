import type { Session } from '@src/types/session'

export type ISessionRepository = {
  save(session: Session): Promise<void>
  load(sessionId: string): Promise<Session>
  exists(sessionId: string): Promise<boolean>
  delete(sessionId: string): Promise<void>
  list(): Promise<Session[]>
  getSessionPath(sessionId: string): string
}
