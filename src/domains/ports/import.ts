import type { Session } from '@src/types/session'

export type ImportSessionOptions = {
  name?: string
  labels?: string[]
}

export type ISessionImportDomain = {
  resolveWorkingDir(claudeSessionId: string): string
  validateSession(claudeSessionId: string, workingDir: string): void
  buildSession(claudeSessionId: string, workingDir: string, options: ImportSessionOptions): Session
}
