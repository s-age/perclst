import { schema, safeParse } from '../schema'
import { stringRule } from '../rules/string'
import { formatRule } from '../rules/format'

const summarizeSchema = schema({
  label: stringRule().optional(),
  like: stringRule().optional(),
  format: formatRule()
})

export type SummarizeSessionsInput = typeof summarizeSchema._output

export function parseSummarizeSessions(raw: unknown): SummarizeSessionsInput {
  return safeParse(summarizeSchema, raw)
}
