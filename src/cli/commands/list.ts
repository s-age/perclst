import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { SessionService } from '@src/services/sessionService'
import { logger } from '@src/utils/logger'

export async function listCommand() {
  try {
    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const sessions = await sessionService.list()

    if (sessions.length === 0) {
      logger.print('No sessions found')
      return
    }

    logger.print(`\nFound ${sessions.length} session(s):\n`)

    for (const session of sessions) {
      const status = session.metadata.status

      const label = `${session.name ?? 'anonymous'}(${session.id})`
      logger.print(`[${status}] ${label}`)
      logger.print(`  Working dir: ${session.working_dir}`)
      if (session.procedure) {
        logger.print(`  Procedure: ${session.procedure}`)
      }
      logger.print('')
    }
  } catch (error) {
    logger.error('Failed to list sessions', error as Error)
    process.exit(1)
  }
}
