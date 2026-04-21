import { schema, safeParse } from '../schema'
import { stringRule } from '../rules/string'

const inspectSchema = schema({
  old: stringRule({ required: true }),
  new: stringRule({ required: true })
})

export type InspectSessionInput = typeof inspectSchema._output

export function parseInspectSession(raw: unknown): InspectSessionInput {
  return safeParse(inspectSchema, raw)
}
