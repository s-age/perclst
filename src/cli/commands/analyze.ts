import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { AnalyzeService } from '@src/services/analyzeService'
import { logger } from '@src/utils/logger'
import type { Session } from '@src/types/session'
import type { AnalysisSummary } from '@src/types/analysis'

export type AnalyzeOptions = {
  format?: 'text' | 'json'
  printDetail?: boolean
}

/**
 * Format a tool input as a compact single-line string.
 * Shows the most relevant field(s) for each tool.
 */
function formatToolInput(name: string, input: Record<string, unknown>): string {
  // Extract the most meaningful single value for common tools
  const primary =
    input['command'] ?? // Bash
    input['file_path'] ?? // Read, Edit, Write
    input['pattern'] ?? // Glob, Grep
    input['path'] ?? // Glob, Grep path
    input['url'] ?? // WebFetch, WebSearch
    input['query'] ?? // WebSearch, ToolSearch
    input['prompt'] ?? // Agent, Skill
    input['skill'] ?? // Skill
    input['description'] ?? // Agent
    input['task_id'] ?? // Task系
    null

  if (primary !== null) {
    return `${name}(${primary})`
  }

  // Fallback: show all keys
  const pairs = Object.entries(input)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(', ')
  return `${name}(${pairs})`
}

function printJsonOutput(session: Session, summary: AnalysisSummary, printDetail: boolean): void {
  if (printDetail) {
    logger.print(JSON.stringify({ session, summary }, null, 2))
    return
  }
  logger.print(
    JSON.stringify(
      {
        session_id: session.id,
        claude_session_id: session.claude_session_id,
        working_dir: session.working_dir,
        procedure: session.procedure ?? null,
        status: session.metadata.status,
        turns_breakdown: {
          user_instructions: summary.turnsBreakdown.userInstructions,
          tool_use: summary.turnsBreakdown.toolUse,
          assistant_response: summary.turnsBreakdown.assistantResponse,
          total: summary.turnsBreakdown.total
        },
        tool_uses: summary.toolUses.map((t) => ({
          label: formatToolInput(t.name, t.input),
          is_error: t.isError
        })),
        tokens: {
          input_total: summary.tokens.totalInput,
          output_total: summary.tokens.totalOutput,
          cache_read_total: summary.tokens.totalCacheRead,
          cache_creation_total: summary.tokens.totalCacheCreation
        }
      },
      null,
      2
    )
  )
}

function printTextSummary(session: Session, summary: AnalysisSummary): void {
  const { turnsBreakdown: bd, toolUses, tokens } = summary

  logger.print(`\n  Session: ${session.id}`)
  logger.print(`  Status: ${session.metadata.status}  /  Working dir: ${session.working_dir}`)
  if (session.procedure) {
    logger.print(`  Procedure: ${session.procedure}`)
  }

  logger.print(`\n  Turns breakdown:`)
  logger.print(`    User Instructions:  ${bd.userInstructions}`)
  logger.print(`    Tool Use:          ${bd.toolUse} × 2`)
  logger.print(`    Assistant Response: ${bd.assistantResponse}`)
  logger.print(`    Turns:             ${bd.total}`)

  logger.print(`\n  Tool uses:`)
  if (toolUses.length === 0) {
    logger.print(`    (none)`)
  } else {
    for (const t of toolUses) {
      const mark = t.isError ? '✗' : '✓'
      logger.print(`    ${mark}  ${formatToolInput(t.name, t.input)}`)
    }
  }

  logger.print(`\n  Tokens:`)
  logger.print(`    Input:   ${tokens.totalInput.toLocaleString()}`)
  logger.print(`    Output:  ${tokens.totalOutput.toLocaleString()}`)
  if (tokens.totalCacheRead > 0) {
    logger.print(`    Cache read (total): ${tokens.totalCacheRead.toLocaleString()}`)
  }
  if (tokens.totalCacheCreation > 0) {
    logger.print(`    Cache created:      ${tokens.totalCacheCreation.toLocaleString()}`)
  }
  logger.print('')
}

function printDetailedTurns(turns: AnalysisSummary['turns']): void {
  logger.print(`\n  Detail:`)
  for (const turn of turns) {
    if (turn.userMessage !== undefined) {
      logger.print(`\n  ─── User ───`)
      logger.print(`  ${turn.userMessage}`)
    }
    if (turn.thinkingBlocks && turn.thinkingBlocks.length > 0) {
      for (const t of turn.thinkingBlocks) {
        logger.print(`\n  [Thinking] ${t}`)
      }
    }
    if (turn.toolCalls.length > 0) {
      for (const tc of turn.toolCalls) {
        logger.print(`\n  ▶ ${formatToolInput(tc.name, tc.input)}`)
        if (tc.result !== null) {
          logger.print(`    → ${tc.result}`)
        } else {
          logger.print(`    → (no result)`)
        }
      }
    }
    if (turn.assistantText !== undefined) {
      logger.print(`\n  ─── Assistant ───`)
      logger.print(`  ${turn.assistantText}`)
    }
  }
}

export async function analyzeCommand(sessionId: string, options: AnalyzeOptions) {
  try {
    const analyzeService = container.resolve<AnalyzeService>(TOKENS.AnalyzeService)
    const { session, summary } = await analyzeService.analyze(sessionId)

    if (options.format === 'json') {
      printJsonOutput(session, summary, options.printDetail ?? false)
      return
    }

    printTextSummary(session, summary)
    if (options.printDetail) {
      printDetailedTurns(summary.turns)
    }
  } catch (error) {
    logger.error('Failed to analyze session', error as Error)
    process.exit(1)
  }
}
