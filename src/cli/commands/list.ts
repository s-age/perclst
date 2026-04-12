import { SessionManager } from '@src/lib/session/manager'
import { logger } from '@src/lib/utils/logger'

export async function listCommand() {
  try {
    const sessionManager = new SessionManager()
    const sessions = await sessionManager.list()

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
