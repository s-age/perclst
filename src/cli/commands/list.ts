import { SessionManager } from '../../lib/session/manager.js'
import { logger } from '../../lib/utils/logger.js'

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
      const firstTurn = session.turns[0]
      const preview = firstTurn.content.slice(0, 60)
      const status = session.metadata.status

      console.log(`[${status}] ${session.id}`)
      console.log(`  Created: ${new Date(session.created_at).toLocaleString()}`)
      console.log(`  Task: ${preview}${firstTurn.content.length > 60 ? '...' : ''}`)
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
