import { z } from 'zod'

export const tsAnalyzeParams = {
  file_path: z.string().describe('Path to the TypeScript file to analyze')
}
