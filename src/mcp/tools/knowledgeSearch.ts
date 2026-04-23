import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { KnowledgeSearchService } from '@src/services/knowledgeSearchService'

export async function executeKnowledgeSearch(args: {
  query: string
  include_draft?: boolean
}): Promise<{ content: { type: 'text'; text: string }[] }> {
  const service = container.resolve<KnowledgeSearchService>(TOKENS.KnowledgeSearchService)
  const result = service.search({
    query: args.query,
    include_draft: args.include_draft ?? false
  })
  return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
}
