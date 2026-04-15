import type { AnalyzeResult, RewindTurn } from '@src/types/analysis'
import type { IAnalyzeDomain } from '@src/domains/ports/analysis'

export type { AnalyzeResult, RewindTurn }

export class AnalyzeService {
  constructor(private domain: IAnalyzeDomain) {}

  async analyze(sessionId: string): Promise<AnalyzeResult> {
    return this.domain.analyze(sessionId)
  }

  async getRewindTurns(sessionId: string): Promise<RewindTurn[]> {
    return this.domain.getRewindTurns(sessionId)
  }
}
