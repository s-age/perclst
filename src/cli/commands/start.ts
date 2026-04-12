import { SessionManager } from '@src/lib/session/manager'
import { AgentExecutor } from '@src/lib/agent/executor'
import { logger } from '@src/lib/utils/logger'
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

    // Create session
    const sessionManager = new SessionManager()
    const session = await sessionManager.create({
      procedure: options.procedure,
      tags: options.tags
    })

    console.log(`Session created: ${session.id}`)

    // Execute agent
    const executor = new AgentExecutor()
    const response = await executor.execute(session.id, task, {
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
