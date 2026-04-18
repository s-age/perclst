import { z } from 'zod'

export const tsCheckerParams = {
  project_root: z
    .string()
    .optional()
    .describe('Absolute path to the project root. Auto-detected when omitted.'),
  lint_command: z.string().optional().describe('Lint command. Defaults to "npm run lint:fix".'),
  build_command: z.string().optional().describe('Build command. Defaults to "npm run build".'),
  test_command: z.string().optional().describe('Test command. Defaults to "npm run test:unit".')
}
