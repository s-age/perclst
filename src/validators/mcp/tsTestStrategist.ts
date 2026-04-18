import { z } from 'zod'

export const tsTestStrategistParams = {
  target_file_path: z
    .string()
    .describe('Path to the target TypeScript implementation file (.ts or .tsx)'),
  test_file_path: z
    .string()
    .optional()
    .describe('Path to the corresponding test file (auto-discovered if omitted)')
}
