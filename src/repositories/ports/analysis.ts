import type { AssistantTurnEntry, ClaudeSessionData, SessionStats } from '@src/types/analysis'

export type IClaudeSessionRepository = {
  findEncodedDirBySessionId(claudeSessionId: string): string
  decodeWorkingDir(encoded: string): { path: string | null; ambiguous: boolean }
  validateSessionAtDir(claudeSessionId: string, workingDir: string): void
  readSession(
    claudeSessionId: string,
    workingDir: string,
    upToMessageId?: string
  ): Promise<ClaudeSessionData>
  scanSessionStats(
    claudeSessionId: string,
    workingDir: string,
    upToMessageId?: string
  ): Promise<SessionStats>
  getAssistantTurns(claudeSessionId: string, workingDir: string): Promise<AssistantTurnEntry[]>
}
