import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { SessionService } from '@src/services/sessionService'
import { stdout, stderr } from '@src/utils/output'
import { parseTagSession } from '@src/validators/cli/tagSession'

export async function tagCommand(sessionId: string, labels: string[]): Promise<void> {
  try {
    const input = parseTagSession({ sessionId, labels })

    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const resolvedId = await sessionService.resolveId(input.sessionId)
    const session = await sessionService.setLabels(resolvedId, input.labels)

    stdout.print(`Labels set: ${session.id}`)
    stdout.print(`  Labels: ${session.metadata.labels.join(', ')}`)
  } catch (error) {
    stderr.print('Failed to set labels', error as Error)
    process.exit(1)
  }
}
