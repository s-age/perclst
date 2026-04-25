import Table from 'cli-table3'
import ansis from 'ansis'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { SessionService } from '@src/services/sessionService'
import type { AnalyzeService } from '@src/services/analyzeService'
import { stdout, stderr } from '@src/utils/output'
import { toLocaleString } from '@src/utils/date'
import { parseShowSession } from '@src/validators/cli/showSession'
import type { TurnRow } from '@src/types/display'

type RawShowOptions = {
  format?: string
  order?: string
  head?: string
  tail?: string
  length?: string
}

function truncate(text: string, max: number): string {
  const single = ansis.strip(text).replace(/\n/g, ' ')
  return single.length > max ? single.slice(0, max - 1) + '…' : single
}

function printTurnsTable(rows: TurnRow[], length?: number): void {
  const tableOpts: ConstructorParameters<typeof Table>[0] = {
    head: ['N', 'role', 'content'],
    style: { head: [], border: [] }
  }
  if (length !== undefined) tableOpts.colWidths = [5, 13, length + 4]
  const table = new Table(tableOpts)
  for (const row of rows) {
    const content =
      length !== undefined
        ? truncate(row.content, length)
        : ansis.strip(row.content).replace(/\n/g, '\\n')
    table.push([String(row.n), row.role, content])
  }
  stdout.print(table.toString())
}

export async function showCommand(sessionId: string, options: RawShowOptions): Promise<void> {
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
    if (session.metadata.labels.length > 0) {
      stdout.print(`Labels:  ${session.metadata.labels.join(', ')}`)
    }

    const { summary } = await analyzeService.analyze(resolvedId)
    const rows = analyzeService.formatTurns(summary.turns, {
      head: input.head,
      tail: input.tail,
      order: input.order
    })

    if (rows.length === 0) {
      stdout.print(`\n(no turns)`)
      return
    }

    stdout.print('')
    printTurnsTable(rows, input.length)
  } catch (error) {
    stderr.print('Failed to show session', error as Error)
    process.exit(1)
  }
}
