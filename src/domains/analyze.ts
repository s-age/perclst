import type { AnalyzeResult } from '@src/types/analysis'
import type { IAnalyzeDomain } from '@src/domains/ports/analysis'
import type { ISessionDomain } from '@src/domains/ports/session'
import type { IClaudeSessionRepository } from '@src/repositories/ports/analysis'

export class AnalyzeDomain implements IAnalyzeDomain {
  constructor(
    private sessionDomain: ISessionDomain,
    private claudeSessionRepo: IClaudeSessionRepository
  ) {}

  async analyze(sessionId: string): Promise<AnalyzeResult> {
    const session = await this.sessionDomain.get(sessionId)
    const summary = this.claudeSessionRepo.readSession(
      session.claude_session_id,
      session.working_dir
    )
    return { session, summary }
  }
}
