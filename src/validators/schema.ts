import { z } from 'zod'
import { ValidationError } from '@src/errors/validationError'

export function schema<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape)
}

export function safeParse<T>(zodSchema: z.ZodType<T>, raw: unknown): T {
  try {
    return zodSchema.parse(raw)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues
        .map((e) => `${e.path.join('.') || 'input'}: ${e.message}`)
        .join('; ')
      throw new ValidationError(message)
    }
    throw error
  }
}
