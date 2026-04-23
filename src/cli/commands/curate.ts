import { cwdPath } from '@src/utils/path'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { KnowledgeSearchService } from '@src/services/knowledgeSearchService'
import { stdout } from '@src/utils/output'
import { startCommand } from './start'

export async function curateCommand(): Promise<void> {
  const knowledgeService = container.resolve<KnowledgeSearchService>(TOKENS.KnowledgeSearchService)

  if (!knowledgeService.hasDraftEntries()) {
    stdout.print('No draft entries to curate.')
    return
  }

  const knowledgeDir = cwdPath('knowledge')
  await startCommand(
    `Promote all entries in ${knowledgeDir}/draft/ into structured ${knowledgeDir}/ files.`,
    {
      procedure: 'meta-curate-knowledge',
      labels: ['curate'],
      allowedTools: ['Skill', 'Write', 'Read', 'Bash', 'Glob'],
      outputOnly: true
    }
  )
}
