import Table from 'cli-table3'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { SessionService } from '@src/services/sessionService'
import { stdout, stderr } from '@src/utils/output'
import { parseListSessions } from '@src/validators/cli/listSessions'

type RawListOptions = {
  label?: string
  like?: string
}

export async function listCommand(options: RawListOptions) {
  try {
    const input = parseListSessions(options)
    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const sessions = await sessionService.list({
      label: input.label,
      like: input.like
    })

    if (sessions.length === 0) {
      stdout.print('No sessions found')
      return
    }

    const table = new Table({
      head: ['Status', 'Name', 'ID', 'Working Dir', 'Procedure', 'Labels'],
      style: { head: [], border: [] }
    })

    for (const session of sessions) {
      table.push([
        session.metadata.status,
        session.name ?? '—',
        session.id,
        session.working_dir,
        session.procedure ?? '—',
        session.metadata.labels.join(', ') || '—'
      ])
    }

    stdout.print(table.toString())
  } catch (error) {
    stderr.print('Failed to list sessions', error as Error)
    process.exit(1)
  }
}
