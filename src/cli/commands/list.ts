import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { SessionService } from '@src/application/session-service'
import { logger } from '@src/lib/utils/logger'

export async function listCommand() {
  try {
    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const sessions = await sessionService.list()

    if (sessions.length === 0) {
      console.log('No sessions found')
      return
    }

    console.log(`\nFound ${sessions.length} session(s):\n`)

    for (const session of sessions) {
      const status = session.metadata.status

      console.log(`[${status}] ${session.id}`)
      console.log(`  Created: ${new Date(session.created_at).toLocaleString()}`)
      console.log(`  Working dir: ${session.working_dir}`)
      if (session.procedure) {
        console.log(`  Procedure: ${session.procedure}`)
      }
      console.log()
    }
  } catch (error) {
    logger.error('Failed to list sessions', error as Error)
    process.exit(1)
  }
}
