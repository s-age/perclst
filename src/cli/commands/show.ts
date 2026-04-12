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
      logger.print(JSON.stringify(session, null, 2))
      return
    }

    // Text format — metadata only (turns are managed by Claude Code)
    logger.print(`\nSession: ${session.id}`)
    logger.print(`Created: ${new Date(session.created_at).toLocaleString()}`)
    logger.print(`Updated: ${new Date(session.updated_at).toLocaleString()}`)
    logger.print(`Status: ${session.metadata.status}`)
    logger.print(`Working dir: ${session.working_dir}`)

    if (session.procedure) {
      logger.print(`Procedure: ${session.procedure}`)
    }

    if (session.metadata.tags.length > 0) {
      logger.print(`Tags: ${session.metadata.tags.join(', ')}`)
    }

    logger.print(`\nSession history is stored in Claude Code's session files.`)
    logger.print(`Claude session ID: ${session.claude_session_id}`)
  } catch (error) {
    logger.error('Failed to show session', error as Error)
    process.exit(1)
  }
}
