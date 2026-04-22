import { spawnSync } from 'child_process'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { SessionService } from '@src/services/sessionService'
import { ValidationError } from '@src/errors/validationError'
import { stderr } from '@src/utils/output'
import { parseChatSession } from '@src/validators/cli/chatSession'

export async function chatCommand(sessionId: string): Promise<void> {
  try {
    const input = parseChatSession({ sessionId })
    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const resolvedId = await sessionService.resolveId(input.sessionId)
    spawnSync('claude', ['--resume', resolvedId], { stdio: 'inherit' })
  } catch (error) {
    if (error instanceof ValidationError) {
      stderr.print(`Invalid arguments: ${error.message}`)
    } else {
      stderr.print('Failed to start chat session', error as Error)
    }
    process.exit(1)
  }
}
