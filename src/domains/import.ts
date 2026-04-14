import {
  findEncodedDirBySessionId,
  decodeWorkingDir,
  validateSessionAtDir
} from '@src/repositories/claudeSessions'

export type IImportDomain = {
  resolveWorkingDir(claudeSessionId: string): string
  validateSession(claudeSessionId: string, workingDir: string): void
}

export class ImportDomain implements IImportDomain {
  resolveWorkingDir(claudeSessionId: string): string {
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

  validateSession(claudeSessionId: string, workingDir: string): void {
    validateSessionAtDir(claudeSessionId, workingDir)
  }
}
