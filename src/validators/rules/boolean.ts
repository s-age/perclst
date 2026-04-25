import { z } from 'zod'

export function booleanRule(): ReturnType<typeof z.boolean> {
  return z.boolean()
}
