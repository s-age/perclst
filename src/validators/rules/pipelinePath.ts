import { z } from 'zod'

const PIPELINE_EXTENSIONS = ['.json', '.yaml', '.yml']

const pipelinePathSchema = z
  .string()
  .min(1)
  .refine((p) => PIPELINE_EXTENSIONS.some((ext) => p.endsWith(ext)), {
    message: `must end with ${PIPELINE_EXTENSIONS.join(', ')}`
  })

export function pipelinePathRule(): typeof pipelinePathSchema {
  return pipelinePathSchema
}
