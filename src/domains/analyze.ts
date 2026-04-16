import type { AnalyzeResult, RewindTurn } from '@src/types/analysis'
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
    const effectiveClaudeSessionId =
      session.rewind_source_claude_session_id ?? session.claude_session_id
    const summary = this.claudeSessionRepo.readSession(
      effectiveClaudeSessionId,
      session.working_dir,
      session.rewind_to_message_id
    )
    return { session, summary }
  }

  async getRewindTurns(sessionId: string): Promise<RewindTurn[]> {
    const session = await this.sessionDomain.get(sessionId)
    const effectiveClaudeSessionId =
      session.rewind_source_claude_session_id ?? session.claude_session_id
    let turns = this.claudeSessionRepo.getAssistantTurns(
      effectiveClaudeSessionId,
      session.working_dir
    )
    if (session.rewind_to_message_id) {
      const cutoff = turns.findIndex((t) => t.uuid === session.rewind_to_message_id)
      if (cutoff !== -1) {
        turns = turns.slice(0, cutoff + 1)
      }
    }
    return turns.reverse().map((t, i) => ({ index: i, uuid: t.uuid, text: t.text }))
  }
}
