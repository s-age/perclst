import type { Session } from '@src/types/session'
import type { AnalysisSummary } from '@src/types/analysis'
import type { ISessionRepository } from '@src/repositories/sessionRepository'
import type { IClaudeSessionReader } from '@src/repositories/claudeSessionReader'

export type AnalyzeResult = {
  session: Session
  summary: AnalysisSummary
}

export type IAnalyzeDomain = {
  analyze(sessionId: string): Promise<AnalyzeResult>
}

export class AnalyzeDomain implements IAnalyzeDomain {
  constructor(
    private sessionRepository: ISessionRepository,
    private sessionReader: IClaudeSessionReader
  ) {}

  async analyze(sessionId: string): Promise<AnalyzeResult> {
    const session = await this.sessionRepository.load(sessionId)
    const summary = this.sessionReader.read(session.claude_session_id, session.working_dir)
    return { session, summary }
  }
}
