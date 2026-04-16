import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { KnowledgeSearchService } from '@src/services/knowledgeSearchService'

export const knowledge_search = {
  name: 'knowledge_search',
  description:
    'Search the perclst knowledge base by keyword. ' +
    'Matches against the **Keywords:** field declared in each knowledge file. ' +
    'Space-separated terms are ANDed; use OR between groups for OR logic. ' +
    'Examples: "fork session", "zod OR validation", "fork OR resume session"',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'Search query. Supports AND (space or "AND") and OR ("OR") operators. ' +
          'Example: "fork session" → both terms must appear; "zod OR validation" → either term.'
      },
      include_draft: {
        type: 'boolean',
        description: 'Include knowledge/draft/ files in the search. Defaults to false.'
      }
    },
    required: ['query']
  }
}

export async function executeKnowledgeSearch(args: {
  query: string
  include_draft?: boolean
}) {
  const service = container.resolve<KnowledgeSearchService>(TOKENS.KnowledgeSearchService)
  const result = service.search({
    query: args.query,
    include_draft: args.include_draft ?? false
  })
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
}
