import type { Session } from '@src/types/session'
import type { ISessionDomain } from '@src/domains/session'
import { generateId } from '@src/utils/uuid'
import { logger } from '@src/utils/logger'
import {
  findEncodedDirBySessionId,
  decodeWorkingDir
} from '@src/repositories/claudeSessions'

export type ImportOptions = {
  name?: string
  cwd?: string
}

export class ImportService {
  constructor(private sessionDomain: ISessionDomain) {}

  async import(claudeSessionId: string, options: ImportOptions = {}): Promise<Session> {
    const workingDir = options.cwd ?? this.resolveWorkingDir(claudeSessionId)

    const now = new Date().toISOString()
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

  private resolveWorkingDir(claudeSessionId: string): string {
    const encodedDir = findEncodedDirBySessionId(claudeSessionId)
    const { path, ambiguous } = decodeWorkingDir(encodedDir)

    if (ambiguous) {
      throw new Error(
        `Working directory is ambiguous for session ${claudeSessionId}.\n` +
          `Use --cwd to specify the working directory explicitly.`
      )
    }
    if (path === null) {
      throw new Error(
        `Could not decode working directory from project path "${encodedDir}".\n` +
          `Use --cwd to specify the working directory explicitly.`
      )
    }
    return path
  }
}
