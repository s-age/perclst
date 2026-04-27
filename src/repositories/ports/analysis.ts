import type { AssistantTurnEntry, ClaudeSessionData, SessionStats } from '@src/types/analysis'

export type IClaudeSessionRepository = {
  findEncodedDirBySessionId(claudeSessionId: string): string
  decodeWorkingDir(encoded: string): { path: string | null; ambiguous: boolean }
  validateSessionAtDir(claudeSessionId: string, workingDir: string): void
  readSession(
    claudeSessionId: string,
    workingDir: string,
    upToMessageId?: string
  ): ClaudeSessionData
  scanSessionStats(
    claudeSessionId: string,
    workingDir: string,
    upToMessageId?: string
  ): SessionStats
  getAssistantTurns(claudeSessionId: string, workingDir: string): AssistantTurnEntry[]
}
