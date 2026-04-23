import type {
  AnalyzeResult,
  RewindTurn,
  ClaudeCodeTurn,
  SessionSummaryStats
} from '@src/types/analysis'
import type { TurnRow, RowFilter } from '@src/types/display'
import type { ListFilter } from '@src/types/session'
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

  formatTurns(turns: ClaudeCodeTurn[], filter: RowFilter): TurnRow[] {
    return this.domain.formatTurns(turns, filter)
  }

  async summarize(filter: ListFilter): Promise<SessionSummaryStats> {
    return this.domain.summarize(filter)
  }

  async resolveTurnByIndex(sessionId: string, index: number): Promise<string | undefined> {
    if (index === 0) return undefined
    const turns = await this.domain.getRewindTurns(sessionId)
    const turn = turns[index]
    if (!turn) {
      throw new RangeError(
        `Index ${index} is out of range (session has ${turns.length} assistant turns)`
      )
    }
    return turn.uuid
  }
}
