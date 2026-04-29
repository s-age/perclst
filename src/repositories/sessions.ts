import { join } from '@src/utils/path'
import type { Session } from '@src/types/session'
import type { ISessionRepository } from '@src/repositories/ports/session'
import type { FsInfra } from '@src/infrastructures/fs'
import { SessionNotFoundError } from '@src/errors/sessionNotFoundError'

type SessionFs = Pick<
  FsInfra,
  'ensureDir' | 'writeText' | 'fileExists' | 'readText' | 'removeFile' | 'listFiles'
>

export class SessionRepository implements ISessionRepository {
  constructor(
    private fs: SessionFs,
    private sessionsDir: string
  ) {}

  save(session: Session): void {
    this.fs.ensureDir(this.sessionsDir)
    this.fs.writeText(
      join(this.sessionsDir, `${session.id}.json`),
      JSON.stringify(session, null, 2)
    )
  }

  load(sessionId: string): Session {
    const path = join(this.sessionsDir, `${sessionId}.json`)
    if (!this.fs.fileExists(path)) throw new SessionNotFoundError(sessionId)
    return JSON.parse(this.fs.readText(path)) as Session
  }

  exists(sessionId: string): boolean {
    return this.fs.fileExists(join(this.sessionsDir, `${sessionId}.json`))
  }

  async delete(sessionId: string): Promise<void> {
    const path = join(this.sessionsDir, `${sessionId}.json`)
    if (!this.fs.fileExists(path)) throw new SessionNotFoundError(sessionId)
    await this.fs.removeFile(path)
  }

  list(): Session[] {
    const files = this.fs.listFiles(this.sessionsDir, '.json')
    const sessions: Session[] = []
    for (const file of files) {
      const sessionId = file.replace('.json', '')
      try {
        sessions.push(this.load(sessionId))
      } catch {
        continue
      }
    }
    return sessions
  }

  getPath(sessionId: string): string {
    return join(this.sessionsDir, `${sessionId}.json`)
  }

  findByName(name: string): Session | null {
    const all = this.list()
    return all.find((s) => s.name === name) ?? null
  }
}
