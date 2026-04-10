import { SessionManager } from '../../lib/session/manager.js'
import { logger } from '../../lib/utils/logger.js'

export async function deleteCommand(sessionId: string) {
  try {
    const sessionManager = new SessionManager()
    await sessionManager.delete(sessionId)

    console.log(`Session deleted: ${sessionId}`)
  } catch (error) {
    logger.error('Failed to delete session', error as Error)
    process.exit(1)
  }
}
