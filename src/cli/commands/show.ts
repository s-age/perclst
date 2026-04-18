import Table from 'cli-table3'
import ansis from 'ansis'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { SessionService } from '@src/services/sessionService'
import { AnalyzeService } from '@src/services/analyzeService'
import type { ClaudeCodeTurn } from '@src/types/analysis'
import { stdout, stderr } from '@src/utils/output'
import { toLocaleString } from '@src/utils/date'
import { parseShowSession } from '@src/validators/cli/showSession'

const CONTENT_MAX = 120

type RawShowOptions = {
  format?: string
}

type TurnRow = { n: number; role: string; content: string }

function truncate(text: string): string {
  const single = ansis.strip(text).replace(/\n/g, ' ')
  return single.length > CONTENT_MAX ? single.slice(0, CONTENT_MAX - 1) + '…' : single
}

function flattenTurns(turns: ClaudeCodeTurn[]): TurnRow[] {
  const rows: TurnRow[] = []
  let n = 1

  for (const turn of turns) {
    if (turn.userMessage !== undefined) {
      rows.push({ n: n++, role: 'user', content: truncate(turn.userMessage) })
    }

    for (const block of turn.thinkingBlocks ?? []) {
      rows.push({ n: n++, role: 'thinking', content: truncate(block) })
    }

    for (const tool of turn.toolCalls) {
      const inputStr = JSON.stringify(tool.input)
      rows.push({ n: n++, role: 'tool_use', content: truncate(`${tool.name}  ${inputStr}`) })
      if (tool.result !== null) {
        rows.push({ n: n++, role: 'tool_result', content: truncate(tool.result) })
      }
    }

    if (turn.assistantText !== undefined) {
      rows.push({ n: n++, role: 'assistant', content: truncate(turn.assistantText) })
    }
  }

  return rows
}

export async function showCommand(sessionId: string, options: RawShowOptions) {
  try {
    const input = parseShowSession({ sessionId, ...options })

    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const analyzeService = container.resolve<AnalyzeService>(TOKENS.AnalyzeService)
    const resolvedId = await sessionService.resolveId(input.sessionId)
    const session = await sessionService.get(resolvedId)

    if (input.format === 'json') {
      const { summary } = await analyzeService.analyze(resolvedId)
      stdout.print(JSON.stringify({ ...session, turns: summary.turns }, null, 2))
      return
    }

    stdout.print(`\nSession: ${session.id}`)
    if (session.name) stdout.print(`Name:    ${session.name}`)
    stdout.print(`Created: ${toLocaleString(session.created_at)}`)
    stdout.print(`Updated: ${toLocaleString(session.updated_at)}`)
    stdout.print(`Status:  ${session.metadata.status}`)
    stdout.print(`Dir:     ${session.working_dir}`)
    if (session.procedure) stdout.print(`Proc:    ${session.procedure}`)
    if (session.metadata.tags.length > 0) {
      stdout.print(`Tags:    ${session.metadata.tags.join(', ')}`)
    }

    const { summary } = await analyzeService.analyze(resolvedId)
    const rows = flattenTurns(summary.turns)

    if (rows.length === 0) {
      stdout.print(`\n(no turns)`)
      return
    }

    stdout.print('')
    const table = new Table({
      head: ['N', 'role', 'content'],
      style: { head: [], border: [] },
      colWidths: [5, 13, CONTENT_MAX + 4]
    })
    for (const row of rows) {
      table.push([String(row.n), row.role, row.content])
    }
    stdout.print(table.toString())
  } catch (error) {
    stderr.print('Failed to show session', error as Error)
    process.exit(1)
  }
}
