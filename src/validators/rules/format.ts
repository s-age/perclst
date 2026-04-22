import { z } from 'zod'

export function formatRule(): z.ZodDefault<z.ZodEnum<['text', 'json']>> {
  return z.enum(['text', 'json'] as const).default('text')
}
