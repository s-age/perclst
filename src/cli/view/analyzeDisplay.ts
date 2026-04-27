import Table from 'cli-table3'
import type { Session } from '@src/types/session'
import type { AnalysisSummary } from '@src/types/analysis'
import { stdout } from '@src/utils/output'
import { formatKilo } from '@src/utils/token'

export function formatToolInput(name: string, input: Record<string, unknown>): string {
  const primary =
    input['command'] ??
    input['file_path'] ??
    input['pattern'] ??
    input['path'] ??
    input['url'] ??
    input['query'] ??
    input['prompt'] ??
    input['skill'] ??
    input['description'] ??
    input['task_id'] ??
    null

  if (primary !== null) {
    return `${name}(${primary})`
  }

  const pairs = Object.entries(input)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(', ')
  return `${name}(${pairs})`
}

export function printAnalyzeJson(
  session: Session,
  summary: AnalysisSummary,
  printDetail: boolean
): void {
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
          api_calls: summary.turnsBreakdown.apiCalls,
          tool_calls: summary.turnsBreakdown.toolCalls,
          tool_results: summary.turnsBreakdown.toolResults,
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

export function printAnalyzeText(session: Session, summary: AnalysisSummary): void {
  const { turnsBreakdown: bd, toolUses, tokens } = summary

  stdout.print(`\n  Session: ${session.id}`)
  stdout.print(`  Status: ${session.metadata.status}  /  Working dir: ${session.working_dir}`)
  if (session.procedure) {
    stdout.print(`  Procedure: ${session.procedure}`)
  }

  const turnsTable = new Table({ style: { head: [], border: [] } })
  turnsTable.push(
    ['User Instructions', bd.userInstructions],
    ['API Calls', bd.apiCalls],
    ['Tool Calls', bd.toolCalls],
    ['Tool Results', bd.toolResults],
    ['Messages (total)', bd.total]
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

export function printAnalyzeDetail(turns: AnalysisSummary['turns']): void {
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
