import { z } from 'zod'

export function orderRule() {
  return z.enum(['asc', 'desc'] as const).default('asc')
}
