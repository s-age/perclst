import { AgentExecutor } from '../../lib/agent/executor.js'
import { logger } from '../../lib/utils/logger.js'
import { printTurn, DisplayOptions } from '../display.js'

export interface ResumeOptions extends DisplayOptions {
  allowedTools?: string[]
  model?: string
}

export async function resumeCommand(sessionId: string, instruction: string, options: ResumeOptions) {
  try {
    logger.info('Resuming session', { session_id: sessionId })

    const executor = new AgentExecutor()
    const session = await executor.resume(sessionId, instruction, {
      allowedTools: options.allowedTools,
      model: options.model,
    })

    // Display response
    const lastTurn = session.turns[session.turns.length - 1]
    printTurn(lastTurn, options, session)

    console.log(`\nTo resume: cloader resume ${sessionId} "<instruction>"`)
  } catch (error) {
    logger.error('Failed to resume session', error as Error)
    process.exit(1)
  }
}
