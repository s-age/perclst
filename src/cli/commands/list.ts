import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { SessionService } from '@src/services/sessionService'
import { stdout, stderr } from '@src/utils/output'
import { parseListSessions } from '@src/validators/cli/listSessions'
import { printSessionsTable } from '@src/cli/view/listDisplay'

type RawListOptions = {
  label?: string
  like?: string
}

export async function listCommand(options: RawListOptions): Promise<void> {
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

    printSessionsTable(sessions)
  } catch (error) {
    stderr.print('Failed to list sessions', error as Error)
    process.exit(1)
  }
}
