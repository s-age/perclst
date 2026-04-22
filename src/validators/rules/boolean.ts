import { z } from 'zod'

export function booleanRule(): z.ZodBoolean {
  return z.boolean()
}
