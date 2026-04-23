import type {
  AnalyzeResult,
  AnalysisSummary,
  ClaudeCodeTurn,
  RewindTurn,
  SessionSummaryStats
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
  let thinking = 0
  let toolCalls = 0
  let assistantResponse = 0
  const allToolUses: AnalysisSummary['toolUses'] = []

  for (const turn of turns) {
    if (turn.userMessage !== undefined) userInstructions++
    if (turn.toolCalls.length > 0) {
      thinking++
      toolCalls += turn.toolCalls.length
      for (const tc of turn.toolCalls) {
        allToolUses.push({ name: tc.name, input: tc.input, isError: tc.isError })
      }
    } else if (turn.assistantText !== undefined) {
      assistantResponse++
    }
  }

  const toolResults = toolCalls
  return {
    turnsBreakdown: {
      userInstructions,
      thinking,
      toolCalls,
      toolResults,
      assistantResponse,
      total: userInstructions + thinking + toolCalls + toolResults + assistantResponse
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
    const { turns, tokens } = this.claudeSessionRepo.readSession(
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

  async summarize(filter: ListFilter): Promise<SessionSummaryStats> {
    const sessions = await this.sessionDomain.list(filter)

    let turns = 0
    let toolCalls = 0
    let totalInput = 0
    let totalOutput = 0
    let totalCacheRead = 0
    let totalCacheCreation = 0

    for (const session of sessions) {
      try {
        const effectiveId = session.rewind_source_claude_session_id ?? session.claude_session_id
        const data = this.claudeSessionRepo.readSession(
          effectiveId,
          session.working_dir,
          session.rewind_to_message_id
        )
        const { turnsBreakdown } = buildSummaryStats(data.turns)
        turns += turnsBreakdown.userInstructions
        toolCalls += turnsBreakdown.toolCalls
        totalInput += data.tokens.totalInput
        totalOutput += data.tokens.totalOutput
        totalCacheRead += data.tokens.totalCacheRead
        totalCacheCreation += data.tokens.totalCacheCreation
      } catch {
        // skip sessions with missing JSONL files
      }
    }

    return {
      sessions: sessions.length,
      turns,
      toolCalls,
      tokens: { totalInput, totalOutput, totalCacheRead, totalCacheCreation }
    }
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
