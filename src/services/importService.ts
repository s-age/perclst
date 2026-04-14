import type { Session } from '@src/types/session'
import type { ISessionDomain, IImportDomain } from '@src/domains/ports/session'
import { generateId } from '@src/utils/uuid'
import { logger } from '@src/utils/logger'
import { toISO } from '@src/utils/date'

export type ImportOptions = {
  name?: string
  cwd?: string
}

export class ImportService {
  constructor(
    private sessionDomain: ISessionDomain,
    private importDomain: IImportDomain
  ) {}

  async import(claudeSessionId: string, options: ImportOptions = {}): Promise<Session> {
    const workingDir = options.cwd ?? this.importDomain.resolveWorkingDir(claudeSessionId)

    if (options.cwd) {
      this.importDomain.validateSession(claudeSessionId, workingDir)
    }

    const now = toISO()
    const session: Session = {
      id: generateId(),
      ...(options.name !== undefined ? { name: options.name } : {}),
      created_at: now,
      updated_at: now,
      claude_session_id: claudeSessionId,
      working_dir: workingDir,
      metadata: {
        tags: [],
        status: 'completed'
      }
    }

    await this.sessionDomain.save(session)
    logger.info('Session imported', { session_id: session.id, claude_session_id: claudeSessionId })
    return session
  }
}
