import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { AgentService } from '@src/services/agentService'
import { SessionService } from '@src/services/sessionService'
import { logger } from '@src/utils/logger'
import { RateLimitError } from '@src/errors/rateLimitError'
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

    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const agentService = container.resolve<AgentService>(TOKENS.AgentService)

    const session = await sessionService.create({
      procedure: options.procedure,
      tags: options.tags
    })
    const sessionFilePath = sessionService.getPath(session.id)

    const response = await agentService.run(session, task, false, {
      allowedTools: options.allowedTools,
      model: options.model,
      sessionFilePath
    })

    await sessionService.updateStatus(session.id, 'active')

    console.log(`Session created: ${session.id}`)

    printResponse(response, options)

    console.log(`\nTo resume: perclst resume ${session.id} "<instruction>"`)
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
