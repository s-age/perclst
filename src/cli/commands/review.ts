import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { AgentService } from '@src/services/agentService'
import type { Config } from '@src/types/config'
import { stderr } from '@src/utils/output'
import { RateLimitError } from '@src/errors/rateLimitError'
import { ValidationError } from '@src/errors/validationError'
import { parseStartSession } from '@src/validators/cli/startSession'
import { printResponse } from '@src/cli/view/display'

const REVIEW_TOOLS = [
  'Skill',
  'Read',
  'Glob',
  'mcp__perclst__git_pending_changes',
  'mcp__perclst__knowledge_search',
  'mcp__perclst__ask_permission',
  'mcp__perclst__ts_analyze',
  'mcp__perclst__ts_call_graph',
  'mcp__perclst__ts_get_references',
  'mcp__perclst__ts_get_types'
]

type ReviewOptions = {
  output?: string
  outputOnly?: boolean
}

export async function reviewCommand(
  targetPath: string | undefined,
  options: ReviewOptions
): Promise<void> {
  try {
    const target = targetPath ? `target_path: ${targetPath}` : 'the pending git changes'
    const outputLine = options.output ? `\n\nng_output_path: ${options.output}` : ''
    const task = `Review ${target} for architectural violations, security issues, and performance problems.${outputLine}`

    const agentService = container.resolve<AgentService>(TOKENS.AgentService)
    const config = container.resolve<Config>(TOKENS.Config)
    const input = parseStartSession({
      task,
      procedure: 'arch/review',
      labels: ['review'],
      allowedTools: REVIEW_TOOLS,
      outputOnly: options.outputOnly
    })

    const { sessionId, response } = await agentService.start(
      input.task,
      { procedure: input.procedure, labels: input.labels, working_dir: process.cwd() },
      {
        allowedTools: input.allowedTools,
        disallowedTools: input.disallowedTools,
        model: input.model
      }
    )

    printResponse(response, input, config.display, { sessionId })
  } catch (error) {
    if (error instanceof ValidationError) {
      stderr.print(`Invalid arguments: ${error.message}`)
    } else if (error instanceof RateLimitError) {
      const resetMsg = error.resetInfo ? ` Resets: ${error.resetInfo}` : ''
      stderr.print(`Claude usage limit reached.${resetMsg} Please wait and try again.`)
    } else {
      stderr.print('Failed to run review', error as Error)
    }
    process.exit(1)
  }
}
