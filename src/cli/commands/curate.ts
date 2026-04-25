import { cwdPath } from '@src/utils/path'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { AgentService } from '@src/services/agentService'
import type { KnowledgeSearchService } from '@src/services/knowledgeSearchService'
import type { Config } from '@src/types/config'
import { stdout, stderr } from '@src/utils/output'
import { RateLimitError } from '@src/errors/rateLimitError'
import { ValidationError } from '@src/errors/validationError'
import { parseStartSession } from '@src/validators/cli/startSession'
import { printResponse } from '@src/cli/display'

export async function curateCommand(): Promise<void> {
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

    const agentService = container.resolve<AgentService>(TOKENS.AgentService)
    const config = container.resolve<Config>(TOKENS.Config)
    const input = parseStartSession({
      task,
      procedure: 'meta-librarian/curate',
      labels: ['curate'],
      allowedTools: ['Skill', 'Write', 'Read', 'Bash', 'Glob'],
      outputOnly: true
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
      stderr.print('Failed to curate knowledge', error as Error)
    }
    process.exit(1)
  }
}
