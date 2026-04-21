import { z } from 'zod'
import { schema, safeParse } from '../schema'
import { stringRule } from '../rules/string'
import { formatRule } from '../rules/format'
import { intRule } from '../rules/int'

const showSchema = schema({
  sessionId: stringRule({ required: true }),
  format: formatRule(),
  order: z.enum(['asc', 'desc']).default('asc'),
  head: intRule({ min: 1 }).optional(),
  tail: intRule({ min: 1 }).optional()
})

export type ShowSessionInput = typeof showSchema._output

export function parseShowSession(raw: unknown): ShowSessionInput {
  return safeParse(showSchema, raw)
}
