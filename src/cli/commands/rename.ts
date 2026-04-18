import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { SessionService } from '@src/services/sessionService'
import { stdout, stderr } from '@src/utils/output'
import { parseRenameSession } from '@src/validators/cli/renameSession'

export async function renameCommand(sessionId: string, name: string) {
  try {
    const input = parseRenameSession({ sessionId, name })

    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const resolvedId = await sessionService.resolveId(input.sessionId)
    const session = await sessionService.rename(resolvedId, input.name)

    stdout.print(`Session renamed: ${session.id}`)
    stdout.print(`  Name: ${session.name}`)
  } catch (error) {
    stderr.print('Failed to rename session', error as Error)
    process.exit(1)
  }
}
