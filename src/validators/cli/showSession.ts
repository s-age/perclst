import { schema, safeParse } from '../schema'
import { stringRule } from '../rules/string'
import { formatRule } from '../rules/format'

const showSchema = schema({
  sessionId: stringRule({ required: true }),
  format: formatRule()
})

export type ShowSessionInput = typeof showSchema._output

export function parseShowSession(raw: unknown): ShowSessionInput {
  return safeParse(showSchema, raw)
}
