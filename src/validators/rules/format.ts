import { z } from 'zod'

export function formatRule() {
  return z.enum(['text', 'json'] as const).default('text')
}
