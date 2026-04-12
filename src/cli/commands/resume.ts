import { AgentExecutor } from '@src/lib/agent/executor'
import { logger } from '@src/lib/utils/logger'
import { printResponse, DisplayOptions } from '@src/cli/display'

export type ResumeOptions = {
  allowedTools?: string[]
  model?: string
} & DisplayOptions

export async function resumeCommand(
  sessionId: string,
  instruction: string,
  options: ResumeOptions
) {
  try {
    logger.info('Resuming session', { session_id: sessionId })

    const executor = new AgentExecutor()
    const response = await executor.resume(sessionId, instruction, {
      allowedTools: options.allowedTools,
      model: options.model
    })

    // Display response
    printResponse(response, options)

    console.log(`\nTo resume: perclst resume ${sessionId} "<instruction>"`)
  } catch (error) {
    logger.error('Failed to resume session', error as Error)
    process.exit(1)
  }
}
