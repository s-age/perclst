import { z } from 'zod'

type StringArrayRuleOpts = { required?: boolean }

export function stringArrayRule(opts: StringArrayRuleOpts = {}) {
  let s = z.array(z.string())
  if (opts.required) s = s.min(1)
  return s
}
