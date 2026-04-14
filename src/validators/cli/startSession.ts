import { schema, safeParse } from '../schema'
import { stringRule } from '../rules/string'
import { intRule } from '../rules/int'
import { stringArrayRule } from '../rules/stringArray'
import { booleanRule } from '../rules/boolean'
import { formatRule } from '../rules/format'

const startSchema = schema({
  task: stringRule({ required: true }),
  procedure: stringRule().optional(),
  name: stringRule().optional(),
  tags: stringArrayRule().optional(),
  allowedTools: stringArrayRule().optional(),
  model: stringRule().optional(),
  maxTurns: intRule().optional(),
  maxContextTokens: intRule().optional(),
  format: formatRule(),
  silentThoughts: booleanRule().optional(),
  silentToolResponse: booleanRule().optional(),
  silentUsage: booleanRule().optional(),
  outputOnly: booleanRule().optional()
})

export type StartSessionInput = typeof startSchema._output

export function parseStartSession(raw: unknown): StartSessionInput {
  return safeParse(startSchema, raw)
}
