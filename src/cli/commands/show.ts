import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { SessionService } from '@src/services/sessionService'
import { stdout, stderr } from '@src/utils/output'
import { toLocaleString } from '@src/utils/date'
import { parseShowSession } from '@src/validators/cli/showSession'

type RawShowOptions = {
  format?: string
}

export async function showCommand(sessionId: string, options: RawShowOptions) {
  try {
    const input = parseShowSession({ sessionId, ...options })

    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const resolvedId = await sessionService.resolveId(input.sessionId)
    const session = await sessionService.get(resolvedId)

    if (input.format === 'json') {
      stdout.print(JSON.stringify(session, null, 2))
      return
    }

    // Text format — metadata only (turns are managed by Claude Code)
    stdout.print(`\nSession: ${session.id}`)
    stdout.print(`Created: ${toLocaleString(session.created_at)}`)
    stdout.print(`Updated: ${toLocaleString(session.updated_at)}`)
    stdout.print(`Status: ${session.metadata.status}`)
    stdout.print(`Working dir: ${session.working_dir}`)

    if (session.procedure) {
      stdout.print(`Procedure: ${session.procedure}`)
    }

    if (session.metadata.tags.length > 0) {
      stdout.print(`Tags: ${session.metadata.tags.join(', ')}`)
    }

    stdout.print(`\nSession history is stored in Claude Code's session files.`)
    stdout.print(`Claude session ID: ${session.claude_session_id}`)
  } catch (error) {
    stderr.print('Failed to show session', error as Error)
    process.exit(1)
  }
}
