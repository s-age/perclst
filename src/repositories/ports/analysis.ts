import type { AnalysisSummary, AssistantTurnEntry } from '@src/types/analysis'

export type IClaudeSessionRepository = {
  findEncodedDirBySessionId(claudeSessionId: string): string
  decodeWorkingDir(encoded: string): { path: string | null; ambiguous: boolean }
  validateSessionAtDir(claudeSessionId: string, workingDir: string): void
  readSession(claudeSessionId: string, workingDir: string): AnalysisSummary
  getAssistantTurns(claudeSessionId: string, workingDir: string): AssistantTurnEntry[]
}
