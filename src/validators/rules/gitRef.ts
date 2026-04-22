import { z } from 'zod'

// Permits branch names, tag names, and commit SHAs.
// Rejects shell metacharacters to prevent command injection via execSync.
const GIT_REF_RE = /^[a-zA-Z0-9._\-/]+$/

export function gitRefRule(): z.ZodString {
  return z
    .string()
    .min(1)
    .regex(
      GIT_REF_RE,
      'invalid git ref: only alphanumerics, dots, hyphens, underscores, and slashes are allowed'
    )
}
