import Table from 'cli-table3'
import ansis from 'ansis'
import type { Session } from '@src/types/session'
import type { TurnRow } from '@src/types/display'
import { stdout } from '@src/utils/output'
import { toLocaleString } from '@src/utils/date'

function truncate(text: string, max: number): string {
  const single = ansis.strip(text).replace(/\n/g, ' ')
  return single.length > max ? single.slice(0, max - 1) + '…' : single
}

export function printShowText(session: Session): void {
  stdout.print(`\nSession: ${session.id}`)
  if (session.name) stdout.print(`Name:    ${session.name}`)
  stdout.print(`Created: ${toLocaleString(session.created_at)}`)
  stdout.print(`Updated: ${toLocaleString(session.updated_at)}`)
  stdout.print(`Status:  ${session.metadata.status}`)
  stdout.print(`Dir:     ${session.working_dir}`)
  if (session.procedure) stdout.print(`Proc:    ${session.procedure}`)
  if (session.metadata.labels.length > 0)
    stdout.print(`Labels:  ${session.metadata.labels.join(', ')}`)
}

export function printTurnsTable(rows: TurnRow[], length?: number): void {
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
