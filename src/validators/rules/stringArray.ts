import { z } from 'zod'

export function stringArrayRule() {
  return z.array(z.string())
}
