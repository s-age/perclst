import type { Session } from '@src/types/session'
import type { ISessionRepository } from '@src/repositories/sessionRepository'
import { SessionNotFoundError } from '@src/utils/errors'

export class InMemorySessionRepository implements ISessionRepository {
  private sessions = new Map<string, Session>()

  async save(session: Session): Promise<void> {
    this.sessions.set(session.id, session)
  }

  async load(sessionId: string): Promise<Session> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new SessionNotFoundError(sessionId)
    }
    return session
  }

  async exists(sessionId: string): Promise<boolean> {
    return this.sessions.has(sessionId)
  }

  async delete(sessionId: string): Promise<void> {
    if (!this.sessions.has(sessionId)) {
      throw new SessionNotFoundError(sessionId)
    }
    this.sessions.delete(sessionId)
  }

  async list(): Promise<Session[]> {
    return Array.from(this.sessions.values()).sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
  }

  getSessionPath(sessionId: string): string {
    return `/tmp/sessions/${sessionId}.json`
  }
}
