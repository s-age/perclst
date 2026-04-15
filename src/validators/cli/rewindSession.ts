import { schema, safeParse } from '../schema'
import { stringRule } from '../rules/string'
import { intRule } from '../rules/int'
import { booleanRule } from '../rules/boolean'

const rewindSchema = schema({
  sessionId: stringRule({ required: true }),
  index: intRule({ min: 0 }).optional(),
  list: booleanRule().optional(),
  length: intRule({ min: 1 }).optional()
})

export type RewindSessionInput = typeof rewindSchema._output

export function parseRewindSession(raw: unknown): RewindSessionInput {
  return safeParse(rewindSchema, raw)
}
