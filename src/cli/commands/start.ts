import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { AgentService } from '@src/services/agentService'
import { logger } from '@src/utils/logger'
import { RateLimitError } from '@src/errors/rateLimitError'
import { ValidationError } from '@src/errors/validationError'
import { printResponse } from '@src/cli/display'
import type { Config } from '@src/types/config'
import { parseStartSession } from '@src/validators/cli/startSession'

type RawStartOptions = {
  procedure?: string
  name?: string
  tags?: string[]
  allowedTools?: string[]
  model?: string
  maxTurns?: string
  maxContextTokens?: string
  silentThoughts?: boolean
  silentToolResponse?: boolean
  silentUsage?: boolean
  outputOnly?: boolean
  format?: string
}

export async function startCommand(task: string, options: RawStartOptions) {
  try {
    logger.info('Starting new agent session')

    const agentService = container.resolve<AgentService>(TOKENS.AgentService)
    const config = container.resolve<Config>(TOKENS.Config)

    const input = parseStartSession({ task, ...options })

    const maxTurns = input.maxTurns ?? config.limits?.max_turns ?? -1
    const maxContextTokens = input.maxContextTokens ?? config.limits?.max_context_tokens ?? -1

    const { sessionId, response } = await agentService.start(
      input.task,
      { name: input.name, procedure: input.procedure, tags: input.tags },
      { allowedTools: input.allowedTools, model: input.model, maxTurns, maxContextTokens }
    )

    logger.print(`Session created: ${sessionId}`)

    printResponse(response, input, config.display, { sessionId })

    logger.print(`\nTo resume: perclst resume ${sessionId} "<instruction>"`)
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.error(`Invalid arguments: ${error.message}`)
    } else if (error instanceof RateLimitError) {
      const resetMsg = error.resetInfo ? ` Resets: ${error.resetInfo}` : ''
      logger.error(`Claude usage limit reached.${resetMsg} Please wait and try again.`)
    } else {
      logger.error('Failed to start session', error as Error)
    }
    process.exit(1)
  }
}
