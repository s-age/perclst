import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { SessionService } from '@src/services/sessionService'
import { logger } from '@src/utils/logger'

export type ShowOptions = {
  format?: 'text' | 'json'
}

export async function showCommand(sessionId: string, options: ShowOptions) {
  try {
    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const session = await sessionService.get(sessionId)

    if (options.format === 'json') {
      console.log(JSON.stringify(session, null, 2))
      return
    }

    // Text format — metadata only (turns are managed by Claude Code)
    console.log(`\nSession: ${session.id}`)
    console.log(`Created: ${new Date(session.created_at).toLocaleString()}`)
    console.log(`Updated: ${new Date(session.updated_at).toLocaleString()}`)
    console.log(`Status: ${session.metadata.status}`)
    console.log(`Working dir: ${session.working_dir}`)

    if (session.procedure) {
      console.log(`Procedure: ${session.procedure}`)
    }

    if (session.metadata.tags.length > 0) {
      console.log(`Tags: ${session.metadata.tags.join(', ')}`)
    }

    console.log(`\nSession history is stored in Claude Code's session files.`)
    console.log(`Claude session ID: ${session.claude_session_id}`)
  } catch (error) {
    logger.error('Failed to show session', error as Error)
    process.exit(1)
  }
}
