import { schema, safeParse } from '../schema'
import { stringRule } from '../rules/string'
import { booleanRule } from '../rules/boolean'
import { formatRule } from '../rules/format'

const analyzeSchema = schema({
  sessionId: stringRule({ required: true }),
  format: formatRule(),
  printDetail: booleanRule().optional(),
})

export type AnalyzeSessionInput = typeof analyzeSchema._output

export function parseAnalyzeSession(raw: unknown): AnalyzeSessionInput {
  return safeParse(analyzeSchema, raw)
}
