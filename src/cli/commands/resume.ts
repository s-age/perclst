import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { AgentService } from '@src/services/agentService'
import { logger } from '@src/utils/logger'
import { RateLimitError } from '@src/errors/rateLimitError'
import { printResponse } from '@src/cli/display'
import type { DisplayOptions } from '@src/types/display'
import type { Config } from '@src/types/config'

export type ResumeOptions = {
  allowedTools?: string[]
  model?: string
  maxTurns?: string
  maxContextTokens?: string
} & DisplayOptions

export async function resumeCommand(
  sessionId: string,
  instruction: string,
  options: ResumeOptions
) {
  try {
    logger.info('Resuming session', { session_id: sessionId })

    const agentService = container.resolve<AgentService>(TOKENS.AgentService)
    const config = container.resolve<Config>(TOKENS.Config)

    const maxTurns =
      options.maxTurns !== undefined
        ? parseInt(options.maxTurns, 10)
        : (config.limits?.max_turns ?? -1)
    const maxContextTokens =
      options.maxContextTokens !== undefined
        ? parseInt(options.maxContextTokens, 10)
        : (config.limits?.max_context_tokens ?? -1)

    const response = await agentService.resume(sessionId, instruction, {
      allowedTools: options.allowedTools,
      model: options.model,
      maxTurns,
      maxContextTokens
    })

    printResponse(response, options, config.display)

    logger.print(`\nTo resume: perclst resume ${sessionId} "<instruction>"`)
  } catch (error) {
    if (error instanceof RateLimitError) {
      const resetMsg = error.resetInfo ? ` Resets: ${error.resetInfo}` : ''
      logger.error(`Claude usage limit reached.${resetMsg} Please wait and try again.`)
    } else {
      logger.error('Failed to resume session', error as Error)
    }
    process.exit(1)
  }
}
