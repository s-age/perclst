import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { AgentService } from '@src/services/agentService'
import { stdout, stderr, debug } from '@src/utils/output'
import { RateLimitError } from '@src/errors/rateLimitError'
import { ValidationError } from '@src/errors/validationError'
import { printResponse, printStreamEvent } from '@src/cli/display'
import type { Config } from '@src/types/config'
import type { AgentStreamEvent } from '@src/types/agent'
import { parseStartSession } from '@src/validators/cli/startSession'

type RawStartOptions = {
  procedure?: string
  name?: string
  tags?: string[]
  allowedTools?: string[]
  disallowedTools?: string[]
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
    debug.print('Starting new agent session')

    const agentService = container.resolve<AgentService>(TOKENS.AgentService)
    const config = container.resolve<Config>(TOKENS.Config)

    const input = parseStartSession({ task, ...options })

    const maxTurns = input.maxTurns ?? config.limits?.max_turns ?? -1
    const maxContextTokens = input.maxContextTokens ?? config.limits?.max_context_tokens ?? -1
    const allowedTools = input.allowedTools ?? config.allowed_tools
    const disallowedTools = input.disallowedTools ?? config.disallowed_tools

    const streaming = !input.outputOnly && input.format !== 'json'
    const onStreamEvent = streaming
      ? (event: AgentStreamEvent) => printStreamEvent(event, config.display)
      : undefined

    const { sessionId, response } = await agentService.start(
      input.task,
      { name: input.name, procedure: input.procedure, tags: input.tags },
      {
        allowedTools,
        disallowedTools,
        model: input.model,
        maxTurns,
        maxContextTokens,
        onStreamEvent
      }
    )

    stdout.print(`Session created: ${sessionId}`)

    printResponse(
      response,
      { ...input, silentThoughts: streaming, silentToolResponse: streaming },
      config.display,
      { sessionId }
    )

    stdout.print(`\nTo resume: perclst resume ${sessionId} "<instruction>"`)
  } catch (error) {
    if (error instanceof ValidationError) {
      stderr.print(`Invalid arguments: ${error.message}`)
    } else if (error instanceof RateLimitError) {
      const resetMsg = error.resetInfo ? ` Resets: ${error.resetInfo}` : ''
      stderr.print(`Claude usage limit reached.${resetMsg} Please wait and try again.`)
    } else {
      stderr.print('Failed to start session', error as Error)
    }
    process.exit(1)
  }
}
