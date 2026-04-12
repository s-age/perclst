import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { AgentService } from '@src/services/agentService'
import { SessionService } from '@src/services/sessionService'
import { logger } from '@src/utils/logger'
import { RateLimitError } from '@src/errors/rateLimitError'
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

    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const agentService = container.resolve<AgentService>(TOKENS.AgentService)

    const session = await sessionService.get(sessionId)
    const sessionFilePath = sessionService.getPath(session.id)

    const response = await agentService.run(session, instruction, true, {
      allowedTools: options.allowedTools,
      model: options.model,
      sessionFilePath
    })

    await sessionService.updateStatus(session.id, 'active')

    // Display response
    printResponse(response, options)

    console.log(`\nTo resume: perclst resume ${sessionId} "<instruction>"`)
  } catch (error) {
    if (error instanceof RateLimitError) {
      const resetMsg = error.resetInfo ? ` Resets: ${error.resetInfo}` : ''
      logger.error(`Claude usage limit reached.${resetMsg} Please wait and try again.`)
    } else {
      logger.error('Failed to resume session', error as Error)
    }
    process.exit(1)
  }
}
