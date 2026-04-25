import { z } from 'zod'

export const gitPendingChangesParams = {
  repo_path: z
    .string()
    .optional()
    .describe(
      'Absolute path to the git repository root. ' +
        'Auto-detected from the project root when omitted.'
    )
}
