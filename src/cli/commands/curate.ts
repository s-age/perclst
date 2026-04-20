import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { KnowledgeSearchService } from '@src/services/knowledgeSearchService'
import { stdout } from '@src/utils/output'
import { startCommand } from './start'

export async function curateCommand() {
  const knowledgeService = container.resolve<KnowledgeSearchService>(TOKENS.KnowledgeSearchService)

  if (!knowledgeService.hasDraftEntries()) {
    stdout.print('No draft entries to curate.')
    return
  }

  await startCommand('Promote all entries in knowledge/draft/ into structured knowledge/ files.', {
    procedure: 'meta-curate-knowledge',
    allowedTools: ['Write', 'Read', 'Bash'],
    outputOnly: true
  })
}
