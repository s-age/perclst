import { z } from 'zod'

export function stringArrayRule(): z.ZodArray<z.ZodString> {
  return z.array(z.string())
}
