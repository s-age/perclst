import { z } from 'zod'

export const knowledgeSearchParams = {
  query: z
    .string()
    .describe(
      'Search query. Supports AND (space or "AND") and OR ("OR") operators. ' +
        'Example: "fork session" → both terms must appear; "zod OR validation" → either term.'
    ),
  include_draft: z
    .boolean()
    .optional()
    .describe('Include knowledge/draft/ files in the search. Defaults to false.')
}
