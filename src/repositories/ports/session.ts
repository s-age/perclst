import type { Session } from '@src/types/session'

export type ISessionRepository = {
  save(session: Session): void
  load(sessionId: string): Session
  exists(sessionId: string): boolean
  delete(sessionId: string): Promise<void>
  list(): Session[]
  getPath(sessionId: string): string
}
