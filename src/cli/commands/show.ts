import Table from 'cli-table3'
import ansis from 'ansis'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { SessionService } from '@src/services/sessionService'
import { AnalyzeService } from '@src/services/analyzeService'
import { stdout, stderr } from '@src/utils/output'
import { toLocaleString } from '@src/utils/date'
import { flattenTurns, applyRowFilter } from '@src/utils/turns'
import { parseShowSession } from '@src/validators/cli/showSession'

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
    const rows = applyRowFilter(flattenTurns(summary.turns), {
      head: input.head,
      tail: input.tail,
      order: input.order
    })

    if (rows.length === 0) {
      stdout.print(`\n(no turns)`)
      return
    }

    stdout.print('')
    const tableOpts: ConstructorParameters<typeof Table>[0] = {
      head: ['N', 'role', 'content'],
      style: { head: [], border: [] }
    }
    if (input.length !== undefined) tableOpts.colWidths = [5, 13, input.length + 4]
    const table = new Table(tableOpts)
    for (const row of rows) {
      const content = input.length !== undefined ? truncate(row.content, input.length) : row.content
      table.push([String(row.n), row.role, content])
    }
    stdout.print(table.toString())
  } catch (error) {
    stderr.print('Failed to show session', error as Error)
    process.exit(1)
  }
}
