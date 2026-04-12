import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { AgentService } from '@src/services/agentService'
import { logger } from '@src/utils/logger'
import { RateLimitError } from '@src/errors/rateLimitError'
import { printResponse, DisplayOptions } from '@src/cli/display'
import type { Config } from '@src/types/config'

export type StartOptions = {
  procedure?: string
  name?: string
  tags?: string[]
  allowedTools?: string[]
  model?: string
} & DisplayOptions

export async function startCommand(task: string, options: StartOptions) {
  try {
    logger.info('Starting new agent session')

    const agentService = container.resolve<AgentService>(TOKENS.AgentService)

    const { sessionId, response } = await agentService.start(
      task,
      { name: options.name, procedure: options.procedure, tags: options.tags },
      { allowedTools: options.allowedTools, model: options.model }
    )

    logger.print(`Session created: ${sessionId}`)

    const config = container.resolve<Config>(TOKENS.Config)
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
