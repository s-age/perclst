import { resolve } from '@src/utils/path'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { AgentService } from '@src/services/agentService'
import type { PlanFileService } from '@src/services/planFileService'
import type { Config } from '@src/types/config'
import type { AgentStreamEvent } from '@src/types/agent'
import { stderr } from '@src/utils/output'
import { ValidationError } from '@src/errors/validationError'
import { RateLimitError } from '@src/errors/rateLimitError'
import { UserCancelledError } from '@src/errors/userCancelledError'
import { parseForgeSession } from '@src/validators/cli/forgeSession'
import { parseStartSession } from '@src/validators/cli/startSession'
import { printResponse, printStreamEvent } from '@src/cli/view/display'

type ForgeOptions = {
  prompt?: string
  outputOnly?: boolean
  model?: string
  effort?: string
}

async function runForgeAgent(task: string, options: ForgeOptions): Promise<void> {
  const agentService = container.resolve<AgentService>(TOKENS.AgentService)
  const config = container.resolve<Config>(TOKENS.Config)
  const startInput = parseStartSession({
    task,
    procedure: 'meta-pipeline-creator/create',
    labels: ['forge'],
    model: options.model,
    effort: options.effort,
    allowedTools: ['Skill', 'Write', 'Read', 'Bash', 'Glob'],
    outputOnly: options.outputOnly
  })
  const streaming = !startInput.outputOnly
  const onStreamEvent = streaming
    ? (event: AgentStreamEvent): void => printStreamEvent(event, config.display)
    : undefined
  const { sessionId, response } = await agentService.start(
    startInput.task,
    { procedure: startInput.procedure, labels: startInput.labels, working_dir: process.cwd() },
    {
      allowedTools: startInput.allowedTools,
      disallowedTools: startInput.disallowedTools,
      model: startInput.model,
      effort: startInput.effort,
      onStreamEvent
    }
  )
  printResponse(
    response,
    { ...startInput, silentThoughts: streaming, silentToolResponse: streaming },
    config.display,
    { sessionId }
  )
}

export async function forgeCommand(
  planFilePath: string,
  options: ForgeOptions = {}
): Promise<void> {
  try {
    const input = parseForgeSession({ planFilePath })
    const absolutePath = resolve(input.planFilePath)
    const planFileService = container.resolve<PlanFileService>(TOKENS.PlanFileService)
    if (!planFileService.exists(absolutePath)) {
      stderr.print(`Plan file not found: ${input.planFilePath}`)
      process.exit(1)
    }
    const additionalPrompt = options.prompt ? `\n\nAdditional instructions: ${options.prompt}` : ''
    const task = `Generate an implementation pipeline from the following plan file: ${absolutePath}${additionalPrompt}`
    await runForgeAgent(task, options)
  } catch (error) {
    if (error instanceof UserCancelledError) {
      stderr.print('Cancelled.')
      process.exit(0)
      return
    }
    if (error instanceof ValidationError) {
      stderr.print(`Invalid arguments: ${error.message}`)
    } else if (error instanceof RateLimitError) {
      const resetMsg = error.resetInfo ? ` Resets: ${error.resetInfo}` : ''
      stderr.print(`Claude usage limit reached.${resetMsg} Please wait and try again.`)
    } else {
      stderr.print('Failed to forge pipeline', error as Error)
    }
    process.exit(1)
  }
}
