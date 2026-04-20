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
