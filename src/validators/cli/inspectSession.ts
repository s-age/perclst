import { schema, safeParse } from '../schema'
import { gitRefRule } from '../rules/gitRef'

const inspectSchema = schema({
  old: gitRefRule(),
  new: gitRefRule()
})

export type InspectSessionInput = typeof inspectSchema._output

export function parseInspectSession(raw: unknown): InspectSessionInput {
  return safeParse(inspectSchema, raw)
}
