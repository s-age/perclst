import type { Session, CreateSessionParams } from '@src/types/session'
import { generateId } from '@src/utils/uuid'
import { logger } from '@src/utils/logger'
import type { ISessionRepository } from '@src/repositories/sessionRepository'

export type ISessionDomain = {
  create(params: CreateSessionParams): Promise<Session>
  get(sessionId: string): Promise<Session>
  getPath(sessionId: string): string
  list(): Promise<Session[]>
  delete(sessionId: string): Promise<void>
  updateStatus(sessionId: string, status: 'active' | 'completed' | 'failed'): Promise<Session>
}

export class SessionDomain implements ISessionDomain {
  constructor(private storage: ISessionRepository) {
    logger.debug('SessionDomain initialized')
  }

  async create(params: CreateSessionParams): Promise<Session> {
    const id = generateId()
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
    return this.storage.load(sessionId)
  }

  getPath(sessionId: string): string {
    return this.storage.getSessionPath(sessionId)
  }

  async list(): Promise<Session[]> {
    return this.storage.list()
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
