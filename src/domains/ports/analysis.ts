import type { AnalyzeResult, RewindTurn } from '@src/types/analysis'

export type IAnalyzeDomain = {
  analyze(sessionId: string): Promise<AnalyzeResult>
  getRewindTurns(sessionId: string): Promise<RewindTurn[]>
}
