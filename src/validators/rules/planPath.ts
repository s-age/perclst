import { z } from 'zod'

const planPathSchema = z
  .string()
  .min(1)
  .refine((p) => !p.includes('..'), { message: 'path traversal (..) is not allowed' })
  .transform((p) => p.replace(/^\.\//, ''))
  .refine((p) => p.startsWith('plans/'), { message: 'must be within the plans/ directory' })
  .refine((p) => p.endsWith('.md'), { message: 'must end with .md' })

export function planPathRule(): typeof planPathSchema {
  return planPathSchema
}
