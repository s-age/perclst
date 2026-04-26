import { schema, safeParse } from '../schema'
import { planPathRule } from '../rules/planPath'

const forgeSchema = schema({
  planFilePath: planPathRule()
})

export type ForgeSessionInput = typeof forgeSchema._output

export function parseForgeSession(raw: unknown): ForgeSessionInput {
  return safeParse(forgeSchema, raw)
}
