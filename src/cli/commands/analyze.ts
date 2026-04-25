import Table from 'cli-table3'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { AnalyzeService } from '@src/services/analyzeService'
import type { SessionService } from '@src/services/sessionService'
import { stdout, stderr } from '@src/utils/output'
import type { Session } from '@src/types/session'
import type { AnalysisSummary } from '@src/types/analysis'
import { parseAnalyzeSession } from '@src/validators/cli/analyzeSession'

type RawAnalyzeOptions = {
  format?: string
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
    input['task_id'] ?? // Task tools
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
    stdout.print(JSON.stringify({ session, summary }, null, 2))
    return
  }
  stdout.print(
    JSON.stringify(
      {
        session_id: session.id,
        claude_session_id: session.claude_session_id,
        working_dir: session.working_dir,
        procedure: session.procedure ?? null,
        status: session.metadata.status,
        turns_breakdown: {
          user_instructions: summary.turnsBreakdown.userInstructions,
          thinking: summary.turnsBreakdown.thinking,
          tool_calls: summary.turnsBreakdown.toolCalls,
          tool_results: summary.turnsBreakdown.toolResults,
          assistant_response: summary.turnsBreakdown.assistantResponse,
          total: summary.turnsBreakdown.total
        },
        tool_uses: summary.toolUses.map((t) => ({
          label: formatToolInput(t.name, t.input),
          is_error: t.isError
        })),
        tokens: {
          context_window: summary.tokens.contextWindow,
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

function formatKilo(n: number): string {
  return `${(Math.floor(n / 100) / 10).toFixed(1)}k`
}

function printTextSummary(session: Session, summary: AnalysisSummary): void {
  const { turnsBreakdown: bd, toolUses, tokens } = summary

  stdout.print(`\n  Session: ${session.id}`)
  stdout.print(`  Status: ${session.metadata.status}  /  Working dir: ${session.working_dir}`)
  if (session.procedure) {
    stdout.print(`  Procedure: ${session.procedure}`)
  }

  const turnsTable = new Table({ style: { head: [], border: [] } })
  turnsTable.push(
    ['User Instructions', bd.userInstructions],
    ['Thinking', bd.thinking],
    ['Tool Calls', bd.toolCalls],
    ['Tool Results', bd.toolResults],
    ['Assistant Response', bd.assistantResponse],
    ['Turns (total)', bd.total]
  )
  stdout.print(`\n  Turns breakdown:`)
  stdout.print(turnsTable.toString())

  stdout.print(`\n  Tool uses:`)
  if (toolUses.length === 0) {
    stdout.print(`    (none)`)
  } else {
    const toolTable = new Table({
      head: ['', '', 'Tool'],
      style: { head: [], border: [] }
    })
    for (const [i, t] of toolUses.entries()) {
      toolTable.push([String(i + 1), t.isError ? '✗' : '✓', formatToolInput(t.name, t.input)])
    }
    stdout.print(toolTable.toString())
  }

  const tokenRows: [string, string][] = [
    ['Context window', formatKilo(tokens.contextWindow)],
    ['Input', tokens.totalInput.toLocaleString()],
    ['Output', tokens.totalOutput.toLocaleString()]
  ]
  if (tokens.totalCacheRead > 0) {
    tokenRows.push(['Cache read', tokens.totalCacheRead.toLocaleString()])
  }
  if (tokens.totalCacheCreation > 0) {
    tokenRows.push(['Cache created', tokens.totalCacheCreation.toLocaleString()])
  }
  const tokensTable = new Table({ style: { head: [], border: [] } })
  tokensTable.push(...tokenRows)
  stdout.print(`\n  Tokens:`)
  stdout.print(tokensTable.toString())
  stdout.print('')
}

function printDetailedTurns(turns: AnalysisSummary['turns']): void {
  stdout.print(`\n  Detail:`)
  for (const turn of turns) {
    if (turn.userMessage !== undefined) {
      stdout.print(`\n  ─── User ───`)
      stdout.print(`  ${turn.userMessage}`)
    }
    if (turn.thinkingBlocks && turn.thinkingBlocks.length > 0) {
      for (const t of turn.thinkingBlocks) {
        stdout.print(`\n  [Thinking] ${t}`)
      }
    }
    if (turn.toolCalls.length > 0) {
      for (const tc of turn.toolCalls) {
        stdout.print(`\n  ▶ ${formatToolInput(tc.name, tc.input)}`)
        if (tc.result !== null) {
          stdout.print(`    → ${tc.result}`)
        } else {
          stdout.print(`    → (no result)`)
        }
      }
    }
    if (turn.assistantText !== undefined) {
      stdout.print(`\n  ─── Assistant ───`)
      stdout.print(`  ${turn.assistantText}`)
    }
  }
}

export async function analyzeCommand(sessionId: string, options: RawAnalyzeOptions): Promise<void> {
  try {
    const input = parseAnalyzeSession({ sessionId, ...options })

    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const analyzeService = container.resolve<AnalyzeService>(TOKENS.AnalyzeService)
    const resolvedId = await sessionService.resolveId(input.sessionId)
    const { session, summary } = await analyzeService.analyze(resolvedId)

    if (input.format === 'json') {
      printJsonOutput(session, summary, input.printDetail ?? false)
      return
    }

    printTextSummary(session, summary)
    if (input.printDetail) {
      printDetailedTurns(summary.turns)
    }
  } catch (error) {
    stderr.print('Failed to analyze session', error as Error)
    process.exit(1)
  }
}
