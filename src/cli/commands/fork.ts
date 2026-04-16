import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { AgentService } from '@src/services/agentService'
import { SessionService } from '@src/services/sessionService'
import { logger } from '@src/utils/logger'
import { RateLimitError } from '@src/errors/rateLimitError'
import { ValidationError } from '@src/errors/validationError'
import { printResponse } from '@src/cli/display'
import type { Config } from '@src/types/config'
import { parseForkSession } from '@src/validators/cli/forkSession'

type RawForkOptions = {
  name?: string
  allowedTools?: string[]
  disallowedTools?: string[]
  model?: string
  maxTurns?: string
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
) {
  try {
    logger.info('Forking session', { original_session_id: originalSessionId })

    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const agentService = container.resolve<AgentService>(TOKENS.AgentService)
    const config = container.resolve<Config>(TOKENS.Config)

    const input = parseForkSession({ originalSessionId, prompt, ...options })
    const resolvedId = await sessionService.resolveId(input.originalSessionId)

    const maxTurns = input.maxTurns ?? config.limits?.max_turns ?? -1
    const maxContextTokens = input.maxContextTokens ?? config.limits?.max_context_tokens ?? -1
    const allowedTools = input.allowedTools ?? config.allowed_tools
    const disallowedTools = input.disallowedTools ?? config.disallowed_tools

    const newSession = await sessionService.createRewindSession(resolvedId, undefined, input.name)

    const response = await agentService.resume(newSession.id, input.prompt, {
      allowedTools,
      disallowedTools,
      model: input.model,
      maxTurns,
      maxContextTokens
    })

    logger.print(`Session forked: ${newSession.id}`)

    printResponse(response, input, config.display, { sessionId: newSession.id })

    logger.print(`\nTo resume: perclst resume ${newSession.id} "<instruction>"`)
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.error(`Invalid arguments: ${error.message}`)
    } else if (error instanceof RateLimitError) {
      const resetMsg = error.resetInfo ? ` Resets: ${error.resetInfo}` : ''
      logger.error(`Claude usage limit reached.${resetMsg} Please wait and try again.`)
    } else {
      logger.error('Failed to fork session', error as Error)
    }
    process.exit(1)
  }
}
