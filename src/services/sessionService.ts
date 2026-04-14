import type { Session, CreateSessionParams, ISessionDomain } from '@src/types/session'

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
}
