import type { Session } from '@src/types/session'
import type { ISessionDomain } from '@src/domains/ports/session'
import type { ISessionImportDomain } from '@src/domains/ports/import'
import { debug } from '@src/utils/output'

export type ImportOptions = {
  name?: string
  cwd?: string
  labels?: string[]
}

export class ImportService {
  constructor(
    private sessionDomain: ISessionDomain,
    private importDomain: ISessionImportDomain
  ) {}

  async import(claudeSessionId: string, options: ImportOptions = {}): Promise<Session> {
    const workingDir = options.cwd ?? this.importDomain.resolveWorkingDir(claudeSessionId)

    if (options.cwd) {
      this.importDomain.validateSession(claudeSessionId, workingDir)
    }

    const session = this.importDomain.buildSession(claudeSessionId, workingDir, {
      name: options.name,
      labels: options.labels
    })

    await this.sessionDomain.save(session)
    debug.print('Session imported', { session_id: session.id, claude_session_id: claudeSessionId })
    return session
  }
}
