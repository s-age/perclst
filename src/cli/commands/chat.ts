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
    const session = await sessionService.get(resolvedId)

    const needsFork = !!session.rewind_source_claude_session_id
    const claudeArgs = needsFork
      ? [
          '--resume',
          session.rewind_source_claude_session_id!,
          '--fork-session',
          '--session-id',
          session.claude_session_id,
          ...(session.rewind_to_message_id
            ? ['--resume-session-at', session.rewind_to_message_id]
            : [])
        ]
      : ['--resume', session.claude_session_id]

    spawnSync('claude', claudeArgs, { stdio: 'inherit' })

    if (needsFork) {
      session.rewind_source_claude_session_id = undefined
      session.rewind_to_message_id = undefined
      await sessionService.save(session)
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      stderr.print(`Invalid arguments: ${error.message}`)
    } else {
      stderr.print('Failed to start chat session', error as Error)
    }
    process.exit(1)
  }
}
