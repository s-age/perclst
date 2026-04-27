import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { AgentService } from '@src/services/agentService'
import type { Config } from '@src/types/config'
import type { AgentStreamEvent } from '@src/types/agent'
import { stderr } from '@src/utils/output'
import { RateLimitError } from '@src/errors/rateLimitError'
import { ValidationError } from '@src/errors/validationError'
import { parseStartSession } from '@src/validators/cli/startSession'
import { printResponse, printStreamEvent } from '@src/cli/view/display'

const SURVEY_TOOLS = [
  'Skill',
  'Read',
  'Glob',
  'Grep',
  'Write',
  'mcp__perclst__knowledge_search',
  'mcp__perclst__ts_analyze',
  'mcp__perclst__ts_get_references',
  'mcp__perclst__ts_get_types'
]

const REFRESH_TOOLS = ['Skill', 'Read', 'Glob', 'Grep', 'Bash', 'Write', 'mcp__perclst__ts_analyze']

type SurveyOptions = {
  refresh?: boolean
  outputOnly?: boolean
}

async function runSurveyAgent(
  task: string,
  opts: {
    procedure: string
    labels: string[]
    model?: string
    allowedTools: string[]
    outputOnly?: boolean
  }
): Promise<void> {
  const agentService = container.resolve<AgentService>(TOKENS.AgentService)
  const config = container.resolve<Config>(TOKENS.Config)
  const input = parseStartSession({
    task,
    procedure: opts.procedure,
    labels: opts.labels,
    model: opts.model,
    allowedTools: opts.allowedTools,
    outputOnly: opts.outputOnly
  })

  const streaming = !input.outputOnly && input.format !== 'json'
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

export async function surveyCommand(
  query: string | undefined,
  options: SurveyOptions
): Promise<void> {
  if (!options.refresh && !query) {
    stderr.print('A query is required. Use --refresh to update catalogs instead.')
    process.exit(1)
  }

  try {
    if (options.refresh) {
      await runSurveyAgent(
        'Refresh all codebase catalogs in .claude/skills/code-base-survey/ to reflect the current state of src/.',
        {
          procedure: 'code-base-survey/refresh',
          labels: ['survey'],
          model: 'sonnet',
          allowedTools: REFRESH_TOOLS,
          outputOnly: options.outputOnly
        }
      )
      return
    }

    await runSurveyAgent(query!, {
      procedure: 'code-base-survey/survey',
      labels: ['survey'],
      model: 'sonnet',
      allowedTools: SURVEY_TOOLS,
      outputOnly: options.outputOnly
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      stderr.print(`Invalid arguments: ${error.message}`)
    } else if (error instanceof RateLimitError) {
      const resetMsg = error.resetInfo ? ` Resets: ${error.resetInfo}` : ''
      stderr.print(`Claude usage limit reached.${resetMsg} Please wait and try again.`)
    } else {
      stderr.print('Failed to run survey', error as Error)
    }
    process.exit(1)
  }
}
