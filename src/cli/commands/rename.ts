import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { SessionService } from '@src/services/sessionService'
import { stdout, stderr } from '@src/utils/output'
import { UserCancelledError } from '@src/errors/userCancelledError'
import { confirmIfDuplicateName } from '@src/cli/prompt'
import { parseRenameSession } from '@src/validators/cli/renameSession'

type RawRenameOptions = {
  labels?: string[]
}

export async function renameCommand(
  sessionId: string,
  name: string,
  options: RawRenameOptions
): Promise<void> {
  try {
    const input = parseRenameSession({ sessionId, name, ...options })

    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const resolvedId = await sessionService.resolveId(input.sessionId)

    await confirmIfDuplicateName(
      input.name,
      (n) => sessionService.findByName(n),
      resolvedId,
      !!process.stdin.isTTY
    )

    let session = await sessionService.rename(resolvedId, input.name)

    if (input.labels !== undefined) {
      session = await sessionService.setLabels(resolvedId, input.labels)
    }

    stdout.print(`Session renamed: ${session.id}`)
    stdout.print(`  Name: ${session.name}`)
    if (session.metadata.labels.length > 0) {
      stdout.print(`  Labels: ${session.metadata.labels.join(', ')}`)
    }
  } catch (error) {
    if (error instanceof UserCancelledError) {
      stderr.print('Cancelled.')
      process.exit(0)
    }
    stderr.print('Failed to rename session', error as Error)
    process.exit(1)
  }
}
