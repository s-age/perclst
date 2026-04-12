import type { IAnalyzeDomain, AnalyzeResult } from '@src/domains/analyze'

export type { AnalyzeResult }

export class AnalyzeService {
  constructor(private domain: IAnalyzeDomain) {}

  async analyze(sessionId: string): Promise<AnalyzeResult> {
    return this.domain.analyze(sessionId)
  }
}
