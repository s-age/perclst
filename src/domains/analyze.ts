import type {
  AnalyzeResult,
  AnalysisSummary,
  ClaudeCodeTurn,
  RewindTurn,
  SessionSummaryRow
} from '@src/types/analysis'
import type { TurnRow, RowFilter } from '@src/types/display'
import type { ListFilter } from '@src/types/session'
import type { IAnalyzeDomain } from '@src/domains/ports/analysis'
import type { ISessionDomain } from '@src/domains/ports/session'
import type { IClaudeSessionRepository } from '@src/repositories/ports/analysis'
import { flattenTurns, applyRowFilter } from '@src/domains/turns'

export function buildSummaryStats(turns: ClaudeCodeTurn[]): {
  turnsBreakdown: AnalysisSummary['turnsBreakdown']
  toolUses: AnalysisSummary['toolUses']
} {
  let userInstructions = 0
  let apiCalls = 0
  let toolCalls = 0
  const allToolUses: AnalysisSummary['toolUses'] = []

  for (const turn of turns) {
    if (turn.userMessage !== undefined) userInstructions++
    if (turn.toolCalls.length > 0 || turn.assistantText !== undefined) apiCalls++
    if (turn.toolCalls.length > 0) {
      toolCalls += turn.toolCalls.length
      for (const tc of turn.toolCalls) {
        allToolUses.push({ name: tc.name, input: tc.input, isError: tc.isError })
      }
    }
  }

  const toolResults = toolCalls
  return {
    turnsBreakdown: {
      userInstructions,
      apiCalls,
      toolCalls,
      toolResults,
      total: userInstructions + apiCalls + toolCalls + toolResults
    },
    toolUses: allToolUses
  }
}

export class AnalyzeDomain implements IAnalyzeDomain {
  constructor(
    private sessionDomain: ISessionDomain,
    private claudeSessionRepo: IClaudeSessionRepository
  ) {}

  async analyze(sessionId: string): Promise<AnalyzeResult> {
    const session = await this.sessionDomain.get(sessionId)
    const effectiveClaudeSessionId =
      session.rewind_source_claude_session_id ?? session.claude_session_id
    const { turns, tokens } = await this.claudeSessionRepo.readSession(
      effectiveClaudeSessionId,
      session.working_dir,
      session.rewind_to_message_id
    )
    const { turnsBreakdown, toolUses } = buildSummaryStats(turns)
    const summary: AnalysisSummary = { turns, turnsBreakdown, toolUses, tokens }
    return { session, summary }
  }

  formatTurns(turns: ClaudeCodeTurn[], filter: RowFilter): TurnRow[] {
    return applyRowFilter(flattenTurns(turns), filter)
  }

  async summarize(filter: ListFilter): Promise<SessionSummaryRow[]> {
    const sessions = await this.sessionDomain.list(filter)
    const rows: SessionSummaryRow[] = []

    for (const session of sessions) {
      try {
        const effectiveId = session.rewind_source_claude_session_id ?? session.claude_session_id
        const stats = await this.claudeSessionRepo.scanSessionStats(
          effectiveId,
          session.working_dir,
          session.rewind_to_message_id
        )
        rows.push({
          name: session.name ?? session.id,
          id: session.id,
          apiCalls: stats.apiCalls,
          toolCalls: stats.toolCalls,
          tokens: stats.tokens
        })
      } catch {
        // skip sessions with missing JSONL files
      }
    }

    return rows
  }

  async getRewindTurns(sessionId: string): Promise<RewindTurn[]> {
    const session = await this.sessionDomain.get(sessionId)
    const effectiveClaudeSessionId =
      session.rewind_source_claude_session_id ?? session.claude_session_id
    let turns = await this.claudeSessionRepo.getAssistantTurns(
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
