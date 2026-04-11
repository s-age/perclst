import { randomUUID } from 'crypto'
import { ConfigResolver } from '../config/resolver.js'
import { SessionStorage } from './storage.js'
import { Session, CreateSessionParams, ResumeSessionParams, Turn } from './types.js'
import { logger } from '../utils/logger.js'

export class SessionManager {
  private storage: SessionStorage

  constructor() {
    const config = ConfigResolver.load()
    const sessionsDir = ConfigResolver.resolveSessionsDir(config)
    this.storage = new SessionStorage(sessionsDir)

    logger.debug('SessionManager initialized', { sessionsDir })
  }

  async create(params: CreateSessionParams): Promise<Session> {
    const session: Session = {
      id: randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      procedure: params.procedure,
      metadata: {
        parent_session_id: params.parent_session_id,
        tags: params.tags || [],
        status: 'active'
      },
      turns: [
        {
          role: 'user',
          content: params.task,
          timestamp: new Date().toISOString()
        }
      ]
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

  async addTurn(sessionId: string, turn: Turn): Promise<Session> {
    const session = await this.get(sessionId)

    session.turns.push(turn)
    session.updated_at = new Date().toISOString()

    await this.storage.save(session)
    logger.debug('Turn added to session', { session_id: sessionId })

    return session
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

  async updateSummary(sessionId: string, summary: string): Promise<Session> {
    const session = await this.get(sessionId)

    session.summary = summary
    session.updated_at = new Date().toISOString()

    await this.storage.save(session)

    return session
  }
}
