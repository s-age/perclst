import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { AgentService } from '@src/services/agentService'
import { SessionService } from '@src/services/sessionService'
import { stdout, stderr, debug } from '@src/utils/output'
import { RateLimitError } from '@src/errors/rateLimitError'
import { ValidationError } from '@src/errors/validationError'
import { printResponse } from '@src/cli/display'
import type { Config } from '@src/types/config'
import { parseForkSession } from '@src/validators/cli/forkSession'

type RawForkOptions = {
  name?: string
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

export async function forkCommand(
  originalSessionId: string,
  prompt: string,
  options: RawForkOptions
) {
  try {
    debug.print('Forking session', { original_session_id: originalSessionId })

    const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
    const agentService = container.resolve<AgentService>(TOKENS.AgentService)
    const config = container.resolve<Config>(TOKENS.Config)

    const input = parseForkSession({ originalSessionId, prompt, ...options })
    const resolvedId = await sessionService.resolveId(input.originalSessionId)

    const newSession = await sessionService.createRewindSession(resolvedId, undefined, input.name)

    const response = await agentService.resume(newSession.id, input.prompt, {
      allowedTools: input.allowedTools,
      disallowedTools: input.disallowedTools,
      model: input.model,
      maxTurns: input.maxTurns,
      maxContextTokens: input.maxContextTokens
    })

    stdout.print(`Session forked: ${newSession.id}`)

    printResponse(response, input, config.display, { sessionId: newSession.id })

    stdout.print(`\nTo resume: perclst resume ${newSession.id} "<instruction>"`)
  } catch (error) {
    if (error instanceof ValidationError) {
      stderr.print(`Invalid arguments: ${error.message}`)
    } else if (error instanceof RateLimitError) {
      const resetMsg = error.resetInfo ? ` Resets: ${error.resetInfo}` : ''
      stderr.print(`Claude usage limit reached.${resetMsg} Please wait and try again.`)
    } else {
      stderr.print('Failed to fork session', error as Error)
    }
    process.exit(1)
  }
}
