import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { SessionService } from '@src/services/sessionService'
import { logger } from '@src/utils/logger'
import { parseDeleteSession } from '@src/validators/cli/deleteSession'

export async function deleteCommand(sessionId: string) {
  try {
    const input = parseDeleteSession({ sessionId })

    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const resolvedId = await sessionService.resolveId(input.sessionId)
    await sessionService.delete(resolvedId)

    logger.print(`Session deleted: ${resolvedId}`)
  } catch (error) {
    logger.error('Failed to delete session', error as Error)
    process.exit(1)
  }
}
