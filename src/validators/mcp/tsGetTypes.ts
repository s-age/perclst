import { z } from 'zod'

export const tsGetTypesParams = {
  file_path: z.string().describe('Path to the TypeScript file'),
  symbol_name: z.string().describe('Name of the symbol to get type information for')
}
