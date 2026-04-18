import { z } from 'zod'

export const tsGetReferencesParams = {
  file_path: z.string().describe('Path to the TypeScript file'),
  symbol_name: z.string().describe('Name of the symbol to find references for'),
  include_test: z
    .boolean()
    .optional()
    .describe('Include references from __tests__ directories (default: false)'),
  recursive: z
    .boolean()
    .optional()
    .describe(
      'Recursively follow callers up the call chain until no more references are found (default: true). Set to false for direct references only.'
    )
}
