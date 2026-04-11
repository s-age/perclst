import { SessionManager } from '../../lib/session/manager.js'
import { AgentExecutor } from '../../lib/agent/executor.js'
import { logger } from '../../lib/utils/logger.js'
import { printTurn, DisplayOptions } from '../display.js'

export interface StartOptions extends DisplayOptions {
  procedure?: string
  tags?: string[]
  allowedTools?: string[]
  model?: string
}

export async function startCommand(task: string, options: StartOptions) {
  try {
    logger.info('Starting new agent session')

    // Create session
    const sessionManager = new SessionManager()
    const session = await sessionManager.create({
      task,
      procedure: options.procedure,
      tags: options.tags,
    })

    console.log(`Session created: ${session.id}`)

    // Execute agent
    const executor = new AgentExecutor()
    const updatedSession = await executor.execute(session.id, {
      allowedTools: options.allowedTools,
      model: options.model,
    })

    // Display response
    const lastTurn = updatedSession.turns[updatedSession.turns.length - 1]
    printTurn(lastTurn, options, updatedSession)

    console.log(`\nTo resume: cloader resume ${session.id} "<instruction>"`)
  } catch (error) {
    logger.error('Failed to start session', error as Error)
    process.exit(1)
  }
}
