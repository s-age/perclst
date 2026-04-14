import type { AnalyzeResult } from '@src/types/analysis'

export type IAnalyzeDomain = {
  analyze(sessionId: string): Promise<AnalyzeResult>
}
