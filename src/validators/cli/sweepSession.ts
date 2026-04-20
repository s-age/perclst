import { schema, safeParse } from '../schema'
import { stringRule } from '../rules/string'
import { booleanRule } from '../rules/boolean'

const sweepSchema = schema({
  from: stringRule()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')
    .optional(),
  to: stringRule()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')
    .optional(),
  status: stringRule().optional(),
  like: stringRule().optional(),
  anonOnly: booleanRule().optional(),
  dryRun: booleanRule().optional(),
  force: booleanRule().optional()
}).superRefine((val, ctx) => {
  if (val.status && !['active', 'completed', 'failed'].includes(val.status)) {
    ctx.addIssue({ code: 'custom', message: '--status must be one of: active, completed, failed' })
  }
  if (!val.from && !val.to && !val.status && !val.like && !val.anonOnly) {
    ctx.addIssue({
      code: 'custom',
      message:
        'at least one filter option is required (--from, --to, --status, --like, --anon-only)'
    })
  }
  if (val.anonOnly && val.like) {
    ctx.addIssue({ code: 'custom', message: '--anon-only and --like cannot be used together' })
  }
  if (!val.to && !val.dryRun && !val.force) {
    ctx.addIssue({
      code: 'custom',
      message:
        '--to is omitted (open-ended range up to now): add --force to confirm, or use --dry-run to preview'
    })
  }
})

export type SweepSessionInput = typeof sweepSchema._output

export function parseSweepSession(raw: unknown): SweepSessionInput {
  return safeParse(sweepSchema, raw)
}
