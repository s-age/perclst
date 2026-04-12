import type { Session } from '@src/types/session'
import type { AnalysisSummary } from '@src/types/analysis'
import type { ISessionDomain } from '@src/domains/session'
import { readClaudeSession } from '@src/repositories/claudeSessions'

export type AnalyzeResult = {
  session: Session
  summary: AnalysisSummary
}

export type IAnalyzeDomain = {
  analyze(sessionId: string): Promise<AnalyzeResult>
}

export class AnalyzeDomain implements IAnalyzeDomain {
  constructor(private sessionDomain: ISessionDomain) {}

  async analyze(sessionId: string): Promise<AnalyzeResult> {
    const session = await this.sessionDomain.get(sessionId)
    const summary = readClaudeSession(session.claude_session_id, session.working_dir)
    return { session, summary }
  }
}
