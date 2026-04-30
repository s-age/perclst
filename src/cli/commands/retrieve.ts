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

type RetrieveOptions = {
  outputOnly?: boolean
  model?: string
  effort?: string
}

export async function retrieveCommand(
  keywords: string[],
  options: RetrieveOptions = {}
): Promise<void> {
  try {
    const keywordList = keywords.join(', ')
    const task = `Search the knowledge base for the following keywords and return a structured summary of findings: ${keywordList}`

    const agentService = container.resolve<AgentService>(TOKENS.AgentService)
    const config = container.resolve<Config>(TOKENS.Config)
    const input = parseStartSession({
      task,
      procedure: 'meta-knowledge-concierge/retrieve',
      labels: ['retrieve'],
      model: options.model,
      effort: options.effort,
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
  } catch (error) {
    if (error instanceof ValidationError) {
      stderr.print(`Invalid arguments: ${error.message}`)
    } else if (error instanceof RateLimitError) {
      const resetMsg = error.resetInfo ? ` Resets: ${error.resetInfo}` : ''
      stderr.print(`Claude usage limit reached.${resetMsg} Please wait and try again.`)
    } else {
      stderr.print('Failed to retrieve knowledge', error as Error)
    }
    process.exit(1)
  }
}
