import { schema, safeParse } from '../schema'
import { stringRule } from '../rules/string'
import { stringArrayRule } from '../rules/stringArray'

const importSchema = schema({
  claudeSessionId: stringRule({ required: true }),
  name: stringRule().optional(),
  cwd: stringRule().optional(),
  labels: stringArrayRule().optional()
})

export type ImportSessionInput = typeof importSchema._output

export function parseImportSession(raw: unknown): ImportSessionInput {
  return safeParse(importSchema, raw)
}
