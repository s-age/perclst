import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { AgentService } from '@src/services/agentService'
import { logger } from '@src/utils/logger'
import { RateLimitError } from '@src/errors/rateLimitError'
import { ValidationError } from '@src/errors/validationError'
import { printResponse } from '@src/cli/display'
import type { Config } from '@src/types/config'
import { parseResumeSession } from '@src/validators/cli/resumeSession'

type RawResumeOptions = {
  allowedTools?: string[]
  model?: string
  maxTurns?: string
  maxContextTokens?: string
  silentThoughts?: boolean
  silentToolResponse?: boolean
  silentUsage?: boolean
  outputOnly?: boolean
  format?: string
}

export async function resumeCommand(
  sessionId: string,
  instruction: string,
  options: RawResumeOptions
) {
  try {
    logger.info('Resuming session', { session_id: sessionId })

    const agentService = container.resolve<AgentService>(TOKENS.AgentService)
    const config = container.resolve<Config>(TOKENS.Config)

    const input = parseResumeSession({ sessionId, instruction, ...options })

    const maxTurns = input.maxTurns ?? config.limits?.max_turns ?? -1
    const maxContextTokens = input.maxContextTokens ?? config.limits?.max_context_tokens ?? -1

    const response = await agentService.resume(input.sessionId, input.instruction, {
      allowedTools: input.allowedTools,
      model: input.model,
      maxTurns,
      maxContextTokens
    })

    printResponse(response, input, config.display, { sessionId: input.sessionId })

    logger.print(`\nTo resume: perclst resume ${input.sessionId} "<instruction>"`)
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.error(`Invalid arguments: ${error.message}`)
    } else if (error instanceof RateLimitError) {
      const resetMsg = error.resetInfo ? ` Resets: ${error.resetInfo}` : ''
      logger.error(`Claude usage limit reached.${resetMsg} Please wait and try again.`)
    } else {
      logger.error('Failed to resume session', error as Error)
    }
    process.exit(1)
  }
}
