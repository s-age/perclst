import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { AgentService } from '@src/services/agentService'
import { logger } from '@src/utils/logger'
import { RateLimitError } from '@src/errors/rateLimitError'
import { printResponse } from '@src/cli/display'
import type { DisplayOptions } from '@src/types/display'
import type { Config } from '@src/types/config'

export type StartOptions = {
  procedure?: string
  name?: string
  tags?: string[]
  allowedTools?: string[]
  model?: string
  maxTurns?: string
  maxContextTokens?: string
} & DisplayOptions

export async function startCommand(task: string, options: StartOptions) {
  try {
    logger.info('Starting new agent session')

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

    const { sessionId, response } = await agentService.start(
      task,
      { name: options.name, procedure: options.procedure, tags: options.tags },
      { allowedTools: options.allowedTools, model: options.model, maxTurns, maxContextTokens }
    )

    logger.print(`Session created: ${sessionId}`)

    printResponse(response, options, config.display)

    logger.print(`\nTo resume: perclst resume ${sessionId} "<instruction>"`)
  } catch (error) {
    if (error instanceof RateLimitError) {
      const resetMsg = error.resetInfo ? ` Resets: ${error.resetInfo}` : ''
      logger.error(`Claude usage limit reached.${resetMsg} Please wait and try again.`)
    } else {
      logger.error('Failed to start session', error as Error)
    }
    process.exit(1)
  }
}
