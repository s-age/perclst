import { z } from 'zod'

type StringRuleOpts = {
  required?: boolean
  min?: number
  max?: number
}

export function stringRule(opts: StringRuleOpts = {}): z.ZodString {
  let s = z.string()
  if (opts.required) s = s.min(1)
  if (opts.min !== undefined) s = s.min(opts.min)
  if (opts.max !== undefined) s = s.max(opts.max)
  return s
}
