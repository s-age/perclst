import type { IImportDomain, ImportSessionOptions } from '@src/domains/ports/session'
import type { Session } from '@src/types/session'
import type { IClaudeSessionRepository } from '@src/repositories/ports/analysis'
import { generateId } from '@src/utils/uuid'
import { toISO } from '@src/utils/date'

export class ImportDomain implements IImportDomain {
  constructor(private claudeSessionRepo: IClaudeSessionRepository) {}

  resolveWorkingDir(claudeSessionId: string): string {
    const encodedDir = this.claudeSessionRepo.findEncodedDirBySessionId(claudeSessionId)
    const { path, ambiguous } = this.claudeSessionRepo.decodeWorkingDir(encodedDir)

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

  validateSession(claudeSessionId: string, workingDir: string): void {
    this.claudeSessionRepo.validateSessionAtDir(claudeSessionId, workingDir)
  }

  buildSession(
    claudeSessionId: string,
    workingDir: string,
    options: ImportSessionOptions
  ): Session {
    const now = toISO()
    return {
      id: generateId(),
      ...(options.name !== undefined ? { name: options.name } : {}),
      created_at: now,
      updated_at: now,
      claude_session_id: claudeSessionId,
      working_dir: workingDir,
      metadata: {
        labels: options.labels ?? [],
        status: 'completed'
      }
    }
  }
}
