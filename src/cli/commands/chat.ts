import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { AgentService } from '@src/services/agentService'
import type { SessionService } from '@src/services/sessionService'
import { ValidationError } from '@src/errors/validationError'
import { stderr } from '@src/utils/output'
import { parseChatSession } from '@src/validators/cli/chatSession'
import { handleWorkingDirMismatch } from '@src/cli/prompt'
import { UserCancelledError } from '@src/errors/userCancelledError'

type ChatOptions = {
  model?: string
  effort?: string
}

export async function chatCommand(sessionId: string, options: ChatOptions = {}): Promise<void> {
  try {
    const input = parseChatSession({ sessionId, ...options })
    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const agentService = container.resolve<AgentService>(TOKENS.AgentService)
    const resolvedId = await sessionService.resolveId(input.sessionId)
    const session = await sessionService.get(resolvedId)
    await handleWorkingDirMismatch(session.working_dir)
    await agentService.chat(resolvedId, { model: input.model, effort: input.effort })
  } catch (error) {
    if (error instanceof UserCancelledError) {
      stderr.print('Cancelled.')
      process.exit(0)
    } else if (error instanceof ValidationError) {
      stderr.print(`Invalid arguments: ${error.message}`)
    } else {
      stderr.print('Failed to start chat session', error as Error)
    }
    process.exit(1)
  }
}
