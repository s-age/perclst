import Table from 'cli-table3'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { SessionService } from '@src/services/sessionService'
import { stdout, stderr } from '@src/utils/output'

export async function listCommand() {
  try {
    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const sessions = await sessionService.list()

    if (sessions.length === 0) {
      stdout.print('No sessions found')
      return
    }

    const table = new Table({
      head: ['Status', 'Name', 'ID', 'Working Dir', 'Procedure'],
      style: { head: [], border: [] }
    })

    for (const session of sessions) {
      table.push([
        session.metadata.status,
        session.name ?? '—',
        session.id,
        session.working_dir,
        session.procedure ?? '—'
      ])
    }

    stdout.print(table.toString())
  } catch (error) {
    stderr.print('Failed to list sessions', error as Error)
    process.exit(1)
  }
}
