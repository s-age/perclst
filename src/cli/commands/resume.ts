import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { AgentService } from '@src/services/agentService'
import type { SessionService } from '@src/services/sessionService'
import { stdout, stderr, debug } from '@src/utils/output'
import { RateLimitError } from '@src/errors/rateLimitError'
import { ValidationError } from '@src/errors/validationError'
import { printResponse, printStreamEvent } from '@src/cli/display'
import type { Config } from '@src/types/config'
import type { AgentStreamEvent } from '@src/types/agent'
import { parseResumeSession } from '@src/validators/cli/resumeSession'
import { handleWorkingDirMismatch } from '@src/cli/prompt'
import { UserCancelledError } from '@src/errors/userCancelledError'

type RawResumeOptions = {
  labels?: string[]
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

function handleResumeError(error: unknown): never {
  if (error instanceof UserCancelledError) {
    stderr.print('Cancelled.')
    process.exit(0)
  }
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

export async function resumeCommand(
  sessionId: string,
  instruction: string,
  options: RawResumeOptions
): Promise<void> {
  try {
    debug.print('Resuming session', { session_id: sessionId })

    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const agentService = container.resolve<AgentService>(TOKENS.AgentService)
    const config = container.resolve<Config>(TOKENS.Config)

    const input = parseResumeSession({ sessionId, instruction, ...options })
    const resolvedId = await sessionService.resolveId(input.sessionId)
    const session = await sessionService.get(resolvedId)
    const streaming = !input.outputOnly && input.format !== 'json'

    await handleWorkingDirMismatch(session.working_dir, streaming)
    const onStreamEvent = streaming
      ? (event: AgentStreamEvent): void => printStreamEvent(event, config.display)
      : undefined

    const response = await agentService.resume(resolvedId, input.instruction, {
      allowedTools: input.allowedTools,
      disallowedTools: input.disallowedTools,
      model: input.model,
      maxTurns: input.maxTurns,
      maxContextTokens: input.maxContextTokens,
      onStreamEvent
    })

    if (input.labels && input.labels.length > 0) {
      await sessionService.addLabels(resolvedId, input.labels)
    }

    printResponse(
      response,
      { ...input, silentThoughts: streaming, silentToolResponse: streaming },
      config.display,
      { sessionId: resolvedId }
    )

    stdout.print(`\nTo resume: perclst resume ${resolvedId} "<instruction>"`)
  } catch (error) {
    handleResumeError(error)
  }
}
