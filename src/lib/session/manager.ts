import { randomUUID } from 'crypto'
import { ConfigResolver } from '@src/lib/config/resolver'
import { SessionStorage } from './storage'
import type { Session, CreateSessionParams } from '@types/session'
import { logger } from '@src/lib/utils/logger'

export class SessionManager {
  private storage: SessionStorage

  constructor() {
    const config = ConfigResolver.load()
    const sessionsDir = ConfigResolver.resolveSessionsDir(config)
    this.storage = new SessionStorage(sessionsDir)

    logger.debug('SessionManager initialized', { sessionsDir })
  }

  async create(params: CreateSessionParams): Promise<Session> {
    const id = randomUUID()
    const session: Session = {
      id,
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

    await this.storage.save(session)
    logger.info('Session created', { session_id: session.id })

    return session
  }

  async get(sessionId: string): Promise<Session> {
    return await this.storage.load(sessionId)
  }

  getPath(sessionId: string): string {
    return this.storage.getSessionPath(sessionId)
  }

  async list(): Promise<Session[]> {
    return await this.storage.list()
  }

  async delete(sessionId: string): Promise<void> {
    await this.storage.delete(sessionId)
    logger.info('Session deleted', { session_id: sessionId })
  }

  async updateStatus(
    sessionId: string,
    status: 'active' | 'completed' | 'failed'
  ): Promise<Session> {
    const session = await this.get(sessionId)

    session.metadata.status = status
    session.updated_at = new Date().toISOString()

    await this.storage.save(session)
    logger.info('Session status updated', { session_id: sessionId, status })

    return session
  }
}
