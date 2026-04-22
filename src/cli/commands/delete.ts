import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { SessionService } from '@src/services/sessionService'
import { stdout, stderr } from '@src/utils/output'
import { parseDeleteSession } from '@src/validators/cli/deleteSession'

export async function deleteCommand(sessionId: string) {
  try {
    const input = parseDeleteSession({ sessionId })

    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const resolvedId = await sessionService.resolveId(input.sessionId)
    await sessionService.delete(resolvedId)

    stdout.print(`Session deleted: ${resolvedId}`)
  } catch (error) {
    stderr.print('Failed to delete session', error as Error)
    process.exit(1)
  }
}
