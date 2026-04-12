import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { AgentService } from '@src/services/agentService'
import { logger } from '@src/utils/logger'
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

    const agentService = container.resolve<AgentService>(TOKENS.AgentService)
    const response = await agentService.resume(sessionId, instruction, {
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
