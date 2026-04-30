import { existsSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { AgentService } from '@src/services/agentService'
import type { SessionService } from '@src/services/sessionService'
import { stdout, debug } from '@src/utils/output'
import { handleCommandError } from '@src/cli/handleCommandError'
import { printResponse, printStreamEvent } from '@src/cli/view/display'
import { confirmIfDuplicateName } from '@src/cli/prompt'
import type { Config } from '@src/types/config'
import type { AgentStreamEvent } from '@src/types/agent'
import { parseStartSession } from '@src/validators/cli/startSession'

type RawStartOptions = {
  procedure?: string
  name?: string
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

async function checkDuplicateName(name: string): Promise<void> {
  const sessionService = container.resolve<SessionService>(TOKENS.SessionService)
  await confirmIfDuplicateName(
    name,
    (n) => sessionService.findByName(n),
    undefined,
    !!process.stdin.isTTY
  )
}

export async function startCommand(task: string, options: RawStartOptions): Promise<void> {
  try {
    debug.print('Starting new agent session')
    const agentService = container.resolve<AgentService>(TOKENS.AgentService)
    const config = container.resolve<Config>(TOKENS.Config)

    const input = parseStartSession({ task, ...options })

    if (input.name && !input.outputOnly) await checkDuplicateName(input.name)
    const streaming = !input.outputOnly && input.format !== 'json'
    const onStreamEvent = streaming
      ? (event: AgentStreamEvent): void => printStreamEvent(event, config.display)
      : undefined

    const { sessionId, response } = await agentService.start(
      input.task,
      {
        name: input.name,
        procedure: input.procedure,
        labels: input.labels,
        working_dir: process.cwd()
      },
      {
        allowedTools: input.allowedTools,
        disallowedTools: input.disallowedTools,
        model: input.model,
        maxMessages: input.maxMessages,
        maxContextTokens: input.maxContextTokens,
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

    if (consumeChatSignal(sessionId)) {
      await agentService.chat(sessionId)
    } else {
      stdout.print(`\nTo resume: perclst resume ${sessionId} "<instruction>"`)
    }
  } catch (error) {
    handleCommandError(error, 'Failed to start session')
  }
}
