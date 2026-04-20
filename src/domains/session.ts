import type { Session, CreateSessionParams, SweepFilter } from '@src/types/session'
import type { ISessionDomain } from '@src/domains/ports/session'
import type { ISessionRepository } from '@src/repositories/ports/session'
import { generateId } from '@src/utils/uuid'
import { debug } from '@src/utils/output'
import { toISO, toTimestamp } from '@src/utils/date'
import { SessionNotFoundError } from '@src/errors/sessionNotFoundError'

export class SessionDomain implements ISessionDomain {
  constructor(private sessionRepo: ISessionRepository) {
    debug.print('SessionDomain initialized')
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
      working_dir: params.working_dir,
      metadata: {
        parent_session_id: params.parent_session_id,
        tags: params.tags || [],
        status: 'active'
      }
    }

    this.sessionRepo.save(session)
    debug.print('Session created', { session_id: session.id })

    return session
  }

  async get(sessionId: string): Promise<Session> {
    return this.sessionRepo.load(sessionId)
  }

  getPath(sessionId: string): string {
    return this.sessionRepo.getPath(sessionId)
  }

  async list(): Promise<Session[]> {
    const sessions = this.sessionRepo.list().filter((s) => s.id && s.metadata)
    return sessions.sort((a, b) => toTimestamp(b.updated_at) - toTimestamp(a.updated_at))
  }

  async delete(sessionId: string): Promise<void> {
    await this.sessionRepo.delete(sessionId)
    debug.print('Session deleted', { session_id: sessionId })
  }

  async updateStatus(
    sessionId: string,
    status: 'active' | 'completed' | 'failed'
  ): Promise<Session> {
    const session = await this.get(sessionId)

    session.metadata.status = status
    session.updated_at = toISO()

    this.sessionRepo.save(session)
    debug.print('Session status updated', { session_id: sessionId, status })

    return session
  }

  async rename(sessionId: string, name: string): Promise<Session> {
    const session = await this.get(sessionId)

    session.name = name
    session.updated_at = toISO()

    this.sessionRepo.save(session)
    debug.print('Session renamed', { session_id: sessionId, name })

    return session
  }

  async findByName(name: string): Promise<Session | null> {
    return this.sessionRepo.findByName(name)
  }

  async resolveId(nameOrId: string): Promise<string> {
    try {
      await this.get(nameOrId)
      return nameOrId
    } catch (e) {
      if (!(e instanceof SessionNotFoundError)) throw e
      const session = await this.findByName(nameOrId)
      if (session) return session.id
      throw new SessionNotFoundError(nameOrId)
    }
  }

  async createRewind(
    originalSessionId: string,
    messageId: string | undefined,
    name?: string
  ): Promise<Session> {
    const original = await this.get(originalSessionId)
    const id = generateId()
    const now = toISO()
    const session: Session = {
      id,
      ...(name !== undefined ? { name } : {}),
      created_at: now,
      updated_at: now,
      claude_session_id: id,
      working_dir: original.working_dir,
      rewind_source_claude_session_id: original.claude_session_id,
      ...(messageId !== undefined ? { rewind_to_message_id: messageId } : {}),
      metadata: {
        parent_session_id: originalSessionId,
        tags: [],
        status: 'active'
      }
    }
    await this.save(session)
    return session
  }

  async sweep(filter: SweepFilter, dryRun: boolean): Promise<Session[]> {
    const all = await this.list()
    const fromTs = filter.from ? toTimestamp(`${filter.from}T00:00:00.000Z`) : null
    const toTs = filter.to ? toTimestamp(`${filter.to}T23:59:59.999Z`) : null

    const targets = all.filter((s) => {
      const createdTs = toTimestamp(s.created_at)
      if (fromTs !== null && createdTs < fromTs) return false
      if (toTs !== null && createdTs > toTs) return false
      if (filter.status && s.metadata.status !== filter.status) return false
      if (filter.like && !(s.name ?? '').includes(filter.like)) return false
      if (filter.anonOnly && s.name !== undefined) return false
      return true
    })

    if (!dryRun) {
      for (const session of targets) {
        await this.delete(session.id)
      }
    }

    return targets
  }
}
