import { schema, safeParse } from '../schema'
import { stringRule } from '../rules/string'

const deleteSchema = schema({
  sessionId: stringRule({ required: true })
})

export type DeleteSessionInput = typeof deleteSchema._output

export function parseDeleteSession(raw: unknown): DeleteSessionInput {
  return safeParse(deleteSchema, raw)
}
