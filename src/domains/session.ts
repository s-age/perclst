import type { Session, CreateSessionParams } from '@src/types/session'
import { generateId } from '@src/utils/uuid'
import { logger } from '@src/utils/logger'
import {
  saveSession,
  loadSession,
  deleteSession,
  listSessions,
  getSessionPath
} from '@src/repositories/sessions'

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

export class SessionDomain implements ISessionDomain {
  constructor(private sessionsDir: string) {
    logger.debug('SessionDomain initialized')
  }

  async save(session: Session): Promise<void> {
    saveSession(this.sessionsDir, session)
  }

  async create(params: CreateSessionParams): Promise<Session> {
    const id = generateId()
    const session: Session = {
      id,
      ...(params.name !== undefined ? { name: params.name } : {}),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      procedure: params.procedure,
      claude_session_id: id,
      working_dir: process.cwd(),
      metadata: {
        parent_session_id: params.parent_session_id,
        tags: params.tags || [],
        status: 'active'
      }
    }

    saveSession(this.sessionsDir, session)
    logger.info('Session created', { session_id: session.id })

    return session
  }

  async get(sessionId: string): Promise<Session> {
    return loadSession(this.sessionsDir, sessionId)
  }

  getPath(sessionId: string): string {
    return getSessionPath(this.sessionsDir, sessionId)
  }

  async list(): Promise<Session[]> {
    return listSessions(this.sessionsDir)
  }

  async delete(sessionId: string): Promise<void> {
    await deleteSession(this.sessionsDir, sessionId)
    logger.info('Session deleted', { session_id: sessionId })
  }

  async updateStatus(
    sessionId: string,
    status: 'active' | 'completed' | 'failed'
  ): Promise<Session> {
    const session = await this.get(sessionId)

    session.metadata.status = status
    session.updated_at = new Date().toISOString()

    saveSession(this.sessionsDir, session)
    logger.info('Session status updated', { session_id: sessionId, status })

    return session
  }

  async rename(sessionId: string, name: string): Promise<Session> {
    const session = await this.get(sessionId)

    session.name = name
    session.updated_at = new Date().toISOString()

    saveSession(this.sessionsDir, session)
    logger.info('Session renamed', { session_id: sessionId, name })

    return session
  }
}
