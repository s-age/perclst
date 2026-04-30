import { schema, safeParse } from '../schema'
import { stringRule } from '../rules/string'
import { intRule } from '../rules/int'
import { stringArrayRule } from '../rules/stringArray'
import { booleanRule } from '../rules/boolean'
import { formatRule } from '../rules/format'

const forkSchema = schema({
  originalSessionId: stringRule({ required: true }),
  prompt: stringRule({ required: true }),
  name: stringRule().optional(),
  allowedTools: stringArrayRule().optional(),
  disallowedTools: stringArrayRule().optional(),
  model: stringRule().optional(),
  effort: stringRule().optional(),
  maxMessages: intRule().optional(),
  maxContextTokens: intRule().optional(),
  format: formatRule(),
  silentThoughts: booleanRule().optional(),
  silentToolResponse: booleanRule().optional(),
  silentUsage: booleanRule().optional(),
  outputOnly: booleanRule().optional()
})

export type ForkSessionInput = typeof forkSchema._output

export function parseForkSession(raw: unknown): ForkSessionInput {
  return safeParse(forkSchema, raw)
}
