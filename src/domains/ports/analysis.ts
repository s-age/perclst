import type { AnalyzeResult, RewindTurn, ClaudeCodeTurn } from '@src/types/analysis'
import type { TurnRow, RowFilter } from '@src/types/display'

export type IAnalyzeDomain = {
  analyze(sessionId: string): Promise<AnalyzeResult>
  getRewindTurns(sessionId: string): Promise<RewindTurn[]>
  formatTurns(turns: ClaudeCodeTurn[], filter: RowFilter): TurnRow[]
}
