import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { SessionService } from '@src/services/sessionService'
import { AgentService } from '@src/services/agentService'
import { logger } from '@src/utils/logger'
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

    // Create session
    const session = await sessionService.create({
      procedure: options.procedure,
      tags: options.tags
    })

    console.log(`Session created: ${session.id}`)

    // Execute agent
    const response = await agentService.execute(session.id, task, {
      allowedTools: options.allowedTools,
      model: options.model
    })

    // Display response
    printResponse(response, options)

    console.log(`\nTo resume: perclst resume ${session.id} "<instruction>"`)
  } catch (error) {
    logger.error('Failed to start session', error as Error)
    process.exit(1)
  }
}
