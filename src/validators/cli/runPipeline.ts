import { schema, safeParse } from '../schema'
import { stringRule } from '../rules/string'
import { booleanRule } from '../rules/boolean'
import { formatRule } from '../rules/format'
import { pipelineSchemaRule } from '../rules/pipeline'
import type { Pipeline } from '@src/types/pipeline'

const runOptionsSchema = schema({
  pipelinePath: stringRule({ required: true }),
  model: stringRule().optional(),
  outputOnly: booleanRule().optional(),
  batch: booleanRule().optional(),
  yes: booleanRule().optional(),
  format: formatRule()
})

export type RunPipelineInput = typeof runOptionsSchema._output

export function parseRunOptions(raw: unknown): RunPipelineInput {
  return safeParse(runOptionsSchema, raw)
}

export function parsePipeline(raw: unknown): Pipeline {
  return safeParse(pipelineSchemaRule(), raw) as Pipeline
}
