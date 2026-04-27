import Table from 'cli-table3'
import type { Session } from '@src/types/session'
import { stdout } from '@src/utils/output'

export function printSessionsTable(sessions: Session[]): void {
  const table = new Table({
    head: ['Status', 'Name', 'ID', 'Working Dir', 'Procedure', 'Labels'],
    style: { head: [], border: [] }
  })
  for (const s of sessions) {
    table.push([
      s.metadata.status,
      s.name ?? '—',
      s.id,
      s.working_dir,
      s.procedure ?? '—',
      s.metadata.labels.join(', ') || '—'
    ])
  }
  stdout.print(table.toString())
}
