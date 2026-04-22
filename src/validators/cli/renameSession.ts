import { schema, safeParse } from '../schema'
import { stringRule } from '../rules/string'
import { stringArrayRule } from '../rules/stringArray'

const renameSchema = schema({
  sessionId: stringRule({ required: true }),
  name: stringRule({ required: true }),
  labels: stringArrayRule().optional()
})

export type RenameSessionInput = typeof renameSchema._output

export function parseRenameSession(raw: unknown): RenameSessionInput {
  return safeParse(renameSchema, raw)
}
