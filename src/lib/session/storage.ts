import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { Session } from '@types/session'
import { SessionNotFoundError } from '@src/lib/utils/errors'

export class SessionStorage {
  constructor(private sessionsDir: string) {
    this.ensureDirectory()
  }

  private ensureDirectory() {
    if (!existsSync(this.sessionsDir)) {
      mkdirSync(this.sessionsDir, { recursive: true })
    }
  }

  getSessionPath(sessionId: string): string {
    return join(this.sessionsDir, `${sessionId}.json`)
  }

  async save(session: Session): Promise<void> {
    const path = this.getSessionPath(session.id)
    const content = JSON.stringify(session, null, 2)
    writeFileSync(path, content, 'utf-8')
  }

  async load(sessionId: string): Promise<Session> {
    const path = this.getSessionPath(sessionId)

    if (!existsSync(path)) {
      throw new SessionNotFoundError(sessionId)
    }

    const content = readFileSync(path, 'utf-8')
    return JSON.parse(content) as Session
  }

  async exists(sessionId: string): Promise<boolean> {
    const path = this.getSessionPath(sessionId)
    return existsSync(path)
  }

  async delete(sessionId: string): Promise<void> {
    const path = this.getSessionPath(sessionId)

    if (!existsSync(path)) {
      throw new SessionNotFoundError(sessionId)
    }

    const fs = await import('fs/promises')
    await fs.unlink(path)
  }

  async list(): Promise<Session[]> {
    const files = readdirSync(this.sessionsDir)
    const sessions: Session[] = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        const sessionId = file.replace('.json', '')
        try {
          const session = await this.load(sessionId)
          sessions.push(session)
        } catch {
          // Skip invalid session files
          continue
        }
      }
    }

    // Sort by updated_at (newest first)
    return sessions.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
  }
}
