import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { AgentService } from '@src/services/agentService'
import type { SessionService } from '@src/services/sessionService'
import { stdout, debug } from '@src/utils/output'
import { handleCommandError } from '@src/cli/handleCommandError'
import { printResponse } from '@src/cli/view/display'
import type { Config } from '@src/types/config'
import { parseForkSession } from '@src/validators/cli/forkSession'

type RawForkOptions = {
  name?: string
  allowedTools?: string[]
  disallowedTools?: string[]
  model?: string
  effort?: string
  maxMessages?: string
  maxContextTokens?: string
  silentThoughts?: boolean
  silentToolResponse?: boolean
  silentUsage?: boolean
  outputOnly?: boolean
  format?: string
}

export async function forkCommand(
  originalSessionId: string,
  prompt: string,
  options: RawForkOptions
): Promise<void> {
  try {
    debug.print('Forking session', { original_session_id: originalSessionId })

    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const agentService = container.resolve<AgentService>(TOKENS.AgentService)
    const config = container.resolve<Config>(TOKENS.Config)

    const input = parseForkSession({ originalSessionId, prompt, ...options })
    const resolvedId = await sessionService.resolveId(input.originalSessionId)

    const newSession = await sessionService.createRewindSession(resolvedId, undefined, input.name)

    const response = await agentService.resume(newSession.id, input.prompt, {
      allowedTools: input.allowedTools,
      disallowedTools: input.disallowedTools,
      model: input.model,
      effort: input.effort,
      maxMessages: input.maxMessages,
      maxContextTokens: input.maxContextTokens
    })

    stdout.print(`Session forked: ${newSession.id}`)

    printResponse(response, input, config.display, { sessionId: newSession.id })

    stdout.print(`\nTo resume: perclst resume ${newSession.id} "<instruction>"`)
  } catch (error) {
    handleCommandError(error, 'Failed to fork session')
  }
}
