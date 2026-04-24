import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { PipelineFileService } from '@src/services/pipelineFileService'
import { stdout, stderr } from '@src/utils/output'
import { ValidationError } from '@src/errors/validationError'
import { parseInspectSession } from '@src/validators/cli/inspectSession'
import { startCommand } from './start'

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

    await startCommand(
      `Inspect the following git diff and produce a code inspection report:${additionalPrompt}\n\n${diff}`,
      {
        procedure: 'code-inspect/code-inspector',
        labels: ['inspect'],
        model: 'sonnet',
        allowedTools: ['Skill', 'mcp__perclst__knowledge_search'],
        outputOnly: true
      }
    )
  } catch (error) {
    if (error instanceof ValidationError) {
      stderr.print(`Invalid arguments: ${error.message}`)
    } else {
      stderr.print('Failed to run inspect', error as Error)
    }
    process.exit(1)
  }
}
