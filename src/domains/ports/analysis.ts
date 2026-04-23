import type {
  AnalyzeResult,
  RewindTurn,
  ClaudeCodeTurn,
  SessionSummaryRow
} from '@src/types/analysis'
import type { TurnRow, RowFilter } from '@src/types/display'
import type { ListFilter } from '@src/types/session'

export type IAnalyzeDomain = {
  analyze(sessionId: string): Promise<AnalyzeResult>
  getRewindTurns(sessionId: string): Promise<RewindTurn[]>
  formatTurns(turns: ClaudeCodeTurn[], filter: RowFilter): TurnRow[]
  summarize(filter: ListFilter): Promise<SessionSummaryRow[]>
}
