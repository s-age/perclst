import { z } from 'zod'
import { schema, safeParse } from '../schema'
import { stringRule } from '../rules/string'
import { booleanRule } from '../rules/boolean'
import { formatRule } from '../rules/format'
import { stringArrayRule } from '../rules/stringArray'
import { ValidationError } from '@src/errors/validationError'
import type {
  Pipeline,
  PipelineTask,
  NestedPipelineTask,
  ChildPipelineTask
} from '@src/types/pipeline'

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

const rejectedConfigSchema = z.object({
  to: z.string().min(1),
  max_retries: z.number().int().min(1).optional()
})

const agentTaskSchema = z.object({
  type: z.literal('agent'),
  name: z.string().optional(),
  task: z.string().min(1),
  procedure: z.string().optional(),
  model: z.string().optional(),
  allowed_tools: stringArrayRule().optional(),
  disallowed_tools: stringArrayRule().optional(),
  max_turns: z.number().int().optional(),
  max_context_tokens: z.number().int().optional(),
  rejected: rejectedConfigSchema.optional(),
  done: z.boolean().optional()
})

const scriptTaskSchema = z.object({
  type: z.literal('script'),
  command: z.string().min(1),
  rejected: rejectedConfigSchema.optional(),
  done: z.boolean().optional()
})

// eslint-disable-next-line prefer-const
let pipelineTaskSchema: z.ZodType<PipelineTask>

const nestedPipelineTaskSchema: z.ZodType<NestedPipelineTask> = z.object({
  type: z.literal('pipeline'),
  name: z.string().min(1),
  tasks: z.array(z.lazy((): z.ZodType<PipelineTask> => pipelineTaskSchema)).min(1),
  done: z.boolean().optional()
})

const childPipelineTaskSchema: z.ZodType<ChildPipelineTask> = z.object({
  type: z.literal('child'),
  path: z.string().min(1),
  name: z.string().optional(),
  done: z.boolean().optional()
})

pipelineTaskSchema = z.union([
  agentTaskSchema,
  scriptTaskSchema,
  nestedPipelineTaskSchema,
  childPipelineTaskSchema
])

const pipelineSchema = z.object({
  tasks: z.array(pipelineTaskSchema).min(1)
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
