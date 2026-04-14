import type { Session, CreateSessionParams } from '@src/types/session'
import type { ISessionDomain } from '@src/domains/ports/session'
import type { ISessionRepository } from '@src/repositories/ports/session'
import { generateId } from '@src/utils/uuid'
import { logger } from '@src/utils/logger'
import { toISO } from '@src/utils/date'

export class SessionDomain implements ISessionDomain {
  constructor(private sessionRepo: ISessionRepository) {
    logger.debug('SessionDomain initialized')
  }

  async save(session: Session): Promise<void> {
    this.sessionRepo.save(session)
  }

  async create(params: CreateSessionParams): Promise<Session> {
    const id = generateId()
    const session: Session = {
      id,
      ...(params.name !== undefined ? { name: params.name } : {}),
      created_at: toISO(),
      updated_at: toISO(),
      procedure: params.procedure,
      claude_session_id: id,
      working_dir: process.cwd(),
      metadata: {
        parent_session_id: params.parent_session_id,
        tags: params.tags || [],
        status: 'active'
      }
    }

    this.sessionRepo.save(session)
    logger.info('Session created', { session_id: session.id })

    return session
  }

  async get(sessionId: string): Promise<Session> {
    return this.sessionRepo.load(sessionId)
  }

  getPath(sessionId: string): string {
    return this.sessionRepo.getPath(sessionId)
  }

  async list(): Promise<Session[]> {
    return this.sessionRepo.list()
  }

  async delete(sessionId: string): Promise<void> {
    await this.sessionRepo.delete(sessionId)
    logger.info('Session deleted', { session_id: sessionId })
  }

  async updateStatus(
    sessionId: string,
    status: 'active' | 'completed' | 'failed'
  ): Promise<Session> {
    const session = await this.get(sessionId)

    session.metadata.status = status
    session.updated_at = toISO()

    this.sessionRepo.save(session)
    logger.info('Session status updated', { session_id: sessionId, status })

    return session
  }

  async rename(sessionId: string, name: string): Promise<Session> {
    const session = await this.get(sessionId)

    session.name = name
    session.updated_at = toISO()

    this.sessionRepo.save(session)
    logger.info('Session renamed', { session_id: sessionId, name })

    return session
  }
}
