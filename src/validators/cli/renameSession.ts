import { schema, safeParse } from '../schema'
import { stringRule } from '../rules/string'

const renameSchema = schema({
  sessionId: stringRule({ required: true }),
  name: stringRule({ required: true })
})

export type RenameSessionInput = typeof renameSchema._output

export function parseRenameSession(raw: unknown): RenameSessionInput {
  return safeParse(renameSchema, raw)
}
