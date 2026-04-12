import type { AnalysisSummary } from '@src/types/analysis'

export type IClaudeSessionReader = {
  read(claudeSessionId: string, workingDir: string): AnalysisSummary
}
