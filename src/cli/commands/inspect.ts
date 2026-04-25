import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { AgentService } from '@src/services/agentService'
import type { PipelineFileService } from '@src/services/pipelineFileService'
import type { Config } from '@src/types/config'
import { stdout, stderr } from '@src/utils/output'
import { ValidationError } from '@src/errors/validationError'
import { RateLimitError } from '@src/errors/rateLimitError'
import { parseInspectSession } from '@src/validators/cli/inspectSession'
import { parseStartSession } from '@src/validators/cli/startSession'
import { printResponse } from '@src/cli/display'

export async function inspectCommand(
  oldRef: string,
  newRef: string,
  options: { prompt?: string } = {}
): Promise<void> {
  try {
    const input = parseInspectSession({ old: oldRef, new: newRef })
    const pipelineFileService = container.resolve<PipelineFileService>(TOKENS.PipelineFileService)

    const diff = pipelineFileService.getDiff(input.old, input.new)

    if (!diff) {
      stdout.print('No differences found between the specified refs.')
      return
    }

    const additionalPrompt = options.prompt ? `\n\nAdditional instructions: ${options.prompt}` : ''
    const task = `Inspect the following git diff and produce a code inspection report:${additionalPrompt}\n\n${diff}`

    const agentService = container.resolve<AgentService>(TOKENS.AgentService)
    const config = container.resolve<Config>(TOKENS.Config)
    const startInput = parseStartSession({
      task,
      procedure: 'code-inspect/inspect',
      labels: ['inspect'],
      model: 'sonnet',
      allowedTools: ['Skill', 'mcp__perclst__knowledge_search'],
      outputOnly: true
    })

    const { sessionId, response } = await agentService.start(
      startInput.task,
      { procedure: startInput.procedure, labels: startInput.labels, working_dir: process.cwd() },
      {
        allowedTools: startInput.allowedTools,
        disallowedTools: startInput.disallowedTools,
        model: startInput.model
      }
    )

    printResponse(response, startInput, config.display, { sessionId })
  } catch (error) {
    if (error instanceof ValidationError) {
      stderr.print(`Invalid arguments: ${error.message}`)
    } else if (error instanceof RateLimitError) {
      const resetMsg = error.resetInfo ? ` Resets: ${error.resetInfo}` : ''
      stderr.print(`Claude usage limit reached.${resetMsg} Please wait and try again.`)
    } else {
      stderr.print('Failed to run inspect', error as Error)
    }
    process.exit(1)
  }
}
