import { existsSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { AgentService } from '@src/services/agentService'
import type { SessionService } from '@src/services/sessionService'
import { stdout, debug } from '@src/utils/output'
import { handleCommandError } from '@src/cli/handleCommandError'
import { printResponse, printStreamEvent } from '@src/cli/view/display'
import type { Config } from '@src/types/config'
import type { AgentStreamEvent } from '@src/types/agent'
import { parseResumeSession } from '@src/validators/cli/resumeSession'
import { handleWorkingDirMismatch } from '@src/cli/prompt'

type RawResumeOptions = {
  labels?: string[]
  allowedTools?: string[]
  disallowedTools?: string[]
  model?: string
  maxMessages?: string
  maxContextTokens?: string
  silentThoughts?: boolean
  silentToolResponse?: boolean
  silentUsage?: boolean
  outputOnly?: boolean
  format?: string
}

function consumeChatSignal(sessionId: string): boolean {
  const p = `${tmpdir()}/perclst-chat-${sessionId}`
  try {
    if (existsSync(p)) {
      unlinkSync(p)
      return true
    }
  } catch {
    /* ignore */
  }
  return false
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
      maxMessages: input.maxMessages,
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

    if (consumeChatSignal(resolvedId)) {
      await agentService.chat(resolvedId)
    } else {
      stdout.print(`\nTo resume: perclst resume ${resolvedId} "<instruction>"`)
    }
  } catch (error) {
    handleCommandError(error, 'Failed to resume session')
  }
}
