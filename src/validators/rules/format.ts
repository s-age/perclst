import { z } from 'zod'

export function formatRule(): z.ZodDefault<z.ZodEnum<{ text: 'text'; json: 'json' }>> {
  return z.enum(['text', 'json'] as const).default('text')
}
