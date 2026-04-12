import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { AgentService } from '@src/services/agentService'
import { logger } from '@src/utils/logger'
import { RateLimitError } from '@src/utils/errors'
import { printResponse, DisplayOptions } from '@src/cli/display'

export type StartOptions = {
  procedure?: string
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
      { procedure: options.procedure, tags: options.tags },
      { allowedTools: options.allowedTools, model: options.model }
    )

    console.log(`Session created: ${sessionId}`)

    printResponse(response, options)

    console.log(`\nTo resume: perclst resume ${sessionId} "<instruction>"`)
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
