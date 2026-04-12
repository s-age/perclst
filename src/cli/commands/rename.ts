import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { SessionService } from '@src/services/sessionService'
import { logger } from '@src/utils/logger'

export async function renameCommand(sessionId: string, name: string) {
  try {
    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const session = await sessionService.rename(sessionId, name)

    logger.print(`Session renamed: ${session.id}`)
    logger.print(`  Name: ${session.name}`)
  } catch (error) {
    logger.error('Failed to rename session', error as Error)
    process.exit(1)
  }
}
