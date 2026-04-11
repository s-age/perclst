import { SessionManager } from '../../lib/session/manager.js'
import { AgentExecutor } from '../../lib/agent/executor.js'
import { logger } from '../../lib/utils/logger.js'

export interface StartOptions {
  procedure?: string
  tags?: string[]
  allowedTools?: string[]
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
    })

    // Display response
    const lastTurn = updatedSession.turns[updatedSession.turns.length - 1]
    console.log('\n--- Agent Response ---')
    console.log(lastTurn.content)

    if (lastTurn.usage) {
      console.log('\n--- Token Usage ---')
      console.log(`Input: ${lastTurn.usage.input_tokens}`)
      console.log(`Output: ${lastTurn.usage.output_tokens}`)
    }

    console.log(`\nSession ID: ${session.id}`)
  } catch (error) {
    logger.error('Failed to start session', error as Error)
    process.exit(1)
  }
}
