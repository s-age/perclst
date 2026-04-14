import type { IAnalyzeDomain, AnalyzeResult } from '@src/types/analysis'

export type { AnalyzeResult }

export class AnalyzeService {
  constructor(private domain: IAnalyzeDomain) {}

  async analyze(sessionId: string): Promise<AnalyzeResult> {
    return this.domain.analyze(sessionId)
  }
}
