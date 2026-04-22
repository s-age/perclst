import { schema, safeParse } from '../schema'
import { stringRule } from '../rules/string'
import { stringArrayRule } from '../rules/stringArray'

const tagSchema = schema({
  sessionId: stringRule({ required: true }),
  labels: stringArrayRule({ required: true })
})

export type TagSessionInput = typeof tagSchema._output

export function parseTagSession(raw: unknown): TagSessionInput {
  return safeParse(tagSchema, raw)
}
