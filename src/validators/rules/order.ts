import { z } from 'zod'

export function orderRule(): z.ZodDefault<z.ZodEnum<{ asc: 'asc'; desc: 'desc' }>> {
  return z.enum(['asc', 'desc'] as const).default('asc')
}
