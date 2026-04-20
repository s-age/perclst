import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { AgentService } from '@src/services/agentService'
import { SessionService } from '@src/services/sessionService'
import { stdout, stderr, debug } from '@src/utils/output'
import { RateLimitError } from '@src/errors/rateLimitError'
import { ValidationError } from '@src/errors/validationError'
import { printResponse, printStreamEvent } from '@src/cli/display'
import type { Config } from '@src/types/config'
import type { AgentStreamEvent } from '@src/types/agent'
import { parseResumeSession } from '@src/validators/cli/resumeSession'

type RawResumeOptions = {
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

export async function resumeCommand(
  sessionId: string,
  instruction: string,
  options: RawResumeOptions
) {
  try {
    debug.print('Resuming session', { session_id: sessionId })

    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const agentService = container.resolve<AgentService>(TOKENS.AgentService)
    const config = container.resolve<Config>(TOKENS.Config)

    const input = parseResumeSession({ sessionId, instruction, ...options })
    const resolvedId = await sessionService.resolveId(input.sessionId)

    const streaming = !input.outputOnly && input.format !== 'json'
    const onStreamEvent = streaming
      ? (event: AgentStreamEvent) => printStreamEvent(event, config.display)
      : undefined

    const response = await agentService.resume(resolvedId, input.instruction, {
      allowedTools: input.allowedTools,
      disallowedTools: input.disallowedTools,
      model: input.model,
      maxTurns: input.maxTurns,
      maxContextTokens: input.maxContextTokens,
      onStreamEvent
    })

    printResponse(
      response,
      { ...input, silentThoughts: streaming, silentToolResponse: streaming },
      config.display,
      { sessionId: resolvedId }
    )

    stdout.print(`\nTo resume: perclst resume ${resolvedId} "<instruction>"`)
  } catch (error) {
    if (error instanceof ValidationError) {
      stderr.print(`Invalid arguments: ${error.message}`)
    } else if (error instanceof RateLimitError) {
      const resetMsg = error.resetInfo ? ` Resets: ${error.resetInfo}` : ''
      stderr.print(`Claude usage limit reached.${resetMsg} Please wait and try again.`)
    } else {
      stderr.print('Failed to resume session', error as Error)
    }
    process.exit(1)
  }
}
