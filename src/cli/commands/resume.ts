import { AgentExecutor } from '../../lib/agent/executor.js'
import { logger } from '../../lib/utils/logger.js'

export interface ResumeOptions {
  askPermission?: boolean
  allowedTools?: string[]
}

export async function resumeCommand(sessionId: string, instruction: string, options: ResumeOptions) {
  try {
    logger.info('Resuming session', { session_id: sessionId })

    const executor = new AgentExecutor()
    const session = await executor.resume(sessionId, instruction, {
      interactivePermissions: options.askPermission,
      allowedTools: options.allowedTools,
    })

    // Display response
    const lastTurn = session.turns[session.turns.length - 1]
    console.log('\n--- Agent Response ---')
    console.log(lastTurn.content)

    if (lastTurn.usage) {
      console.log('\n--- Token Usage ---')
      console.log(`Input: ${lastTurn.usage.input_tokens}`)
      console.log(`Output: ${lastTurn.usage.output_tokens}`)
    }

    console.log(`\nSession ID: ${sessionId}`)
  } catch (error) {
    logger.error('Failed to resume session', error as Error)
    process.exit(1)
  }
}
