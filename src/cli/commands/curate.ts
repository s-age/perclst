import { cwdPath } from '@src/utils/path'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { AgentService } from '@src/services/agentService'
import type { KnowledgeSearchService } from '@src/services/knowledgeSearchService'
import type { Config } from '@src/types/config'
import type { AgentStreamEvent } from '@src/types/agent'
import { stdout, stderr } from '@src/utils/output'
import { RateLimitError } from '@src/errors/rateLimitError'
import { ValidationError } from '@src/errors/validationError'
import { parseStartSession } from '@src/validators/cli/startSession'
import { printResponse, printStreamEvent } from '@src/cli/view/display'

type CurateOptions = {
  outputOnly?: boolean
  model?: string
  effort?: string
}

async function runCurateAgent(task: string, options: CurateOptions): Promise<void> {
  const agentService = container.resolve<AgentService>(TOKENS.AgentService)
  const config = container.resolve<Config>(TOKENS.Config)
  const input = parseStartSession({
    task,
    procedure: 'meta-librarian/curate',
    labels: ['curate'],
    model: options.model,
    effort: options.effort,
    allowedTools: ['Skill', 'Write', 'Read', 'Bash', 'Glob'],
    outputOnly: options.outputOnly
  })
  const streaming = !input.outputOnly
  const onStreamEvent = streaming
    ? (event: AgentStreamEvent): void => printStreamEvent(event, config.display)
    : undefined
  const { sessionId, response } = await agentService.start(
    input.task,
    { procedure: input.procedure, labels: input.labels, working_dir: process.cwd() },
    {
      allowedTools: input.allowedTools,
      disallowedTools: input.disallowedTools,
      model: input.model,
      effort: input.effort,
      onStreamEvent
    }
  )
  printResponse(
    response,
    { ...input, silentThoughts: streaming, silentToolResponse: streaming },
    config.display,
    { sessionId }
  )
}

export async function curateCommand(options: CurateOptions = {}): Promise<void> {
  try {
    const knowledgeService = container.resolve<KnowledgeSearchService>(
      TOKENS.KnowledgeSearchService
    )
    if (!knowledgeService.hasDraftEntries()) {
      stdout.print('No draft entries to curate.')
      return
    }
    const knowledgeDir = cwdPath('knowledge')
    const task = `Promote all entries in ${knowledgeDir}/draft/ into structured ${knowledgeDir}/ files.`
    await runCurateAgent(task, options)
  } catch (error) {
    if (error instanceof ValidationError) {
      stderr.print(`Invalid arguments: ${error.message}`)
    } else if (error instanceof RateLimitError) {
      const resetMsg = error.resetInfo ? ` Resets: ${error.resetInfo}` : ''
      stderr.print(`Claude usage limit reached.${resetMsg} Please wait and try again.`)
    } else {
      stderr.print('Failed to curate knowledge', error as Error)
    }
    process.exit(1)
  }
}
