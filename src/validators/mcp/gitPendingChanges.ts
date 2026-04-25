import { z } from 'zod'

export const gitPendingChangesParams = {
  repo_path: z
    .string()
    .optional()
    .describe(
      'Absolute path to the git repository root. ' +
        'Auto-detected from the project root when omitted.'
    ),
  extensions: z
    .array(z.string().regex(/^[a-zA-Z0-9]+$/))
    .optional()
    .describe(
      'Restrict the diff to files with these extensions (e.g. ["ts", "tsx"]). ' +
        'Omit to include all files. Useful for skipping pipeline or knowledge diffs to save context.'
    )
}
