import { SessionManager } from '@src/lib/session/manager'
import { logger } from '@src/lib/utils/logger'

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
