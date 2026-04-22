import { schema, safeParse } from '../schema'
import { stringRule } from '../rules/string'
import { intRule } from '../rules/int'
import { stringArrayRule } from '../rules/stringArray'
import { booleanRule } from '../rules/boolean'
import { formatRule } from '../rules/format'

const resumeSchema = schema({
  sessionId: stringRule({ required: true }),
  instruction: stringRule({ required: true }),
  labels: stringArrayRule().optional(),
  allowedTools: stringArrayRule().optional(),
  disallowedTools: stringArrayRule().optional(),
  model: stringRule().optional(),
  maxTurns: intRule().optional(),
  maxContextTokens: intRule().optional(),
  format: formatRule(),
  silentThoughts: booleanRule().optional(),
  silentToolResponse: booleanRule().optional(),
  silentUsage: booleanRule().optional(),
  outputOnly: booleanRule().optional()
})

export type ResumeSessionInput = typeof resumeSchema._output

export function parseResumeSession(raw: unknown): ResumeSessionInput {
  return safeParse(resumeSchema, raw)
}
