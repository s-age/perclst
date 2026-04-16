import type { Session, CreateSessionParams } from '@src/types/session'
import type { ISessionDomain } from '@src/domains/ports/session'
import { toTimestamp, toISO } from '@src/utils/date'
import { generateId } from '@src/utils/uuid'

export type SweepFilter = {
  from?: string
  to?: string
  status?: string
  like?: string
  anonOnly?: boolean
}

export class SessionService {
  constructor(private domain: ISessionDomain) {}

  async create(params: CreateSessionParams): Promise<Session> {
    return this.domain.create(params)
  }

  async get(sessionId: string): Promise<Session> {
    return this.domain.get(sessionId)
  }

  getPath(sessionId: string): string {
    return this.domain.getPath(sessionId)
  }

  async list(): Promise<Session[]> {
    return this.domain.list()
  }

  async delete(sessionId: string): Promise<void> {
    return this.domain.delete(sessionId)
  }

  async updateStatus(
    sessionId: string,
    status: 'active' | 'completed' | 'failed'
  ): Promise<Session> {
    return this.domain.updateStatus(sessionId, status)
  }

  async rename(sessionId: string, name: string): Promise<Session> {
    return this.domain.rename(sessionId, name)
  }

  async findByName(name: string): Promise<Session | null> {
    return this.domain.findByName(name)
  }

  async createRewindSession(
    originalSessionId: string,
    messageId: string | undefined,
    name?: string
  ): Promise<Session> {
    const original = await this.domain.get(originalSessionId)
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
    await this.domain.save(session)
    return session
  }

  async sweep(filter: SweepFilter, dryRun: boolean): Promise<Session[]> {
    const all = await this.domain.list()
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
        await this.domain.delete(session.id)
      }
    }

    return targets
  }
}
