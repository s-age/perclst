import { schema, safeParse } from '../schema'
import { stringRule } from '../rules/string'

const listSchema = schema({
  label: stringRule().optional(),
  like: stringRule().optional()
})

export type ListSessionsInput = typeof listSchema._output

export function parseListSessions(raw: unknown): ListSessionsInput {
  return safeParse(listSchema, raw)
}
