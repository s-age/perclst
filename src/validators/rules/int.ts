import { z } from 'zod'

type IntRuleOpts = {
  min?: number
  max?: number
}

type IntSchema = ReturnType<ReturnType<typeof z.coerce.number>['int']>

export function intRule(opts: IntRuleOpts = {}): IntSchema {
  let s = z.coerce.number().int()
  if (opts.min !== undefined) s = s.min(opts.min)
  if (opts.max !== undefined) s = s.max(opts.max)
  return s
}
