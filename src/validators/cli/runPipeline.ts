import { z } from 'zod'
import { schema, safeParse } from '../schema'
import { stringRule } from '../rules/string'
import { booleanRule } from '../rules/boolean'
import { formatRule } from '../rules/format'
import { stringArrayRule } from '../rules/stringArray'
import { ValidationError } from '@src/errors/validationError'
import type { Pipeline } from '@src/types/pipeline'

const runOptionsSchema = schema({
  pipelinePath: stringRule({ required: true }),
  outputOnly: booleanRule().optional(),
  format: formatRule()
})

export type RunPipelineInput = typeof runOptionsSchema._output

export function parseRunOptions(raw: unknown): RunPipelineInput {
  return safeParse(runOptionsSchema, raw)
}

const agentTaskSchema = z.object({
  type: z.literal('agent'),
  name: z.string().optional(),
  task: z.string().min(1),
  procedure: z.string().optional(),
  model: z.string().optional(),
  allowed_tools: stringArrayRule().optional(),
  disallowed_tools: stringArrayRule().optional(),
  max_turns: z.number().int().optional(),
  max_context_tokens: z.number().int().optional()
})

const scriptTaskSchema = z.object({
  type: z.literal('script'),
  command: z.string().min(1),
  rejected: z
    .object({
      to: z.string().min(1),
      max_retries: z.number().int().min(1).optional()
    })
    .optional()
})

const pipelineSchema = z.object({
  tasks: z.array(z.discriminatedUnion('type', [agentTaskSchema, scriptTaskSchema])).min(1)
})

export function parsePipeline(raw: unknown): Pipeline {
  try {
    return pipelineSchema.parse(raw) as Pipeline
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues
        .map((e) => `${e.path.join('.') || 'input'}: ${e.message}`)
        .join('; ')
      throw new ValidationError(`Invalid pipeline: ${message}`)
    }
    throw error
  }
}
