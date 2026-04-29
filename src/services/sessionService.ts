import type { Session, SweepFilter, ListFilter } from '@src/types/session'
import type { ISessionDomain } from '@src/domains/ports/session'

export type { SweepFilter, ListFilter }

export class SessionService {
  constructor(private domain: ISessionDomain) {}

  async get(sessionId: string): Promise<Session> {
    return this.domain.get(sessionId)
  }

  async list(filter?: ListFilter): Promise<Session[]> {
    return this.domain.list(filter)
  }

  async delete(sessionId: string): Promise<void> {
    return this.domain.delete(sessionId)
  }

  async rename(sessionId: string, name: string): Promise<Session> {
    return this.domain.rename(sessionId, name)
  }

  async setLabels(sessionId: string, labels: string[]): Promise<Session> {
    return this.domain.setLabels(sessionId, labels)
  }

  async addLabels(sessionId: string, labels: string[]): Promise<Session> {
    return this.domain.addLabels(sessionId, labels)
  }

  async findByName(name: string): Promise<Session | null> {
    return this.domain.findByName(name)
  }

  async resolveId(nameOrId: string): Promise<string> {
    return this.domain.resolveId(nameOrId)
  }

  async createRewindSession(
    originalSessionId: string,
    messageId: string | undefined,
    name?: string
  ): Promise<Session> {
    return this.domain.createRewind(originalSessionId, messageId, name)
  }

  async sweep(filter: SweepFilter, dryRun: boolean): Promise<Session[]> {
    return this.domain.sweep(filter, dryRun)
  }
}
