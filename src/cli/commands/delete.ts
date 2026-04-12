import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { SessionService } from '@src/services/sessionService'
import { logger } from '@src/utils/logger'

export async function deleteCommand(sessionId: string) {
  try {
    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    await sessionService.delete(sessionId)

    console.log(`Session deleted: ${sessionId}`)
  } catch (error) {
    logger.error('Failed to delete session', error as Error)
    process.exit(1)
  }
}
