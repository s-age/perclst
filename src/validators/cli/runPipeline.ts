import { schema, safeParse } from '../schema'
import { booleanRule } from '../rules/boolean'
import { formatRule } from '../rules/format'
import { pipelinePathRule } from '../rules/pipelinePath'
import { pipelineSchemaRule } from '../rules/pipeline'
import { stringRule } from '../rules/string'
import type { Pipeline } from '@src/types/pipeline'

const runOptionsSchema = schema({
  pipelinePath: pipelinePathRule(),
  model: stringRule().optional(),
  effort: stringRule().optional(),
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
