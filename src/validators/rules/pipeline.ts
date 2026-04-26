import { z } from 'zod'

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
  labels: z.array(z.string()).optional(),
  allowed_tools: z.array(z.string()).optional(),
  disallowed_tools: z.array(z.string()).optional(),
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
let pipelineTaskSchema: z.ZodTypeAny

const nestedPipelineTaskSchema = z.object({
  type: z.literal('pipeline'),
  name: z.string().min(1),
  tasks: z.array(z.lazy((): z.ZodTypeAny => pipelineTaskSchema)).min(1),
  done: z.boolean().optional()
})

const childPipelineTaskSchema = z.object({
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

export function pipelineSchemaRule(): typeof pipelineSchema {
  return pipelineSchema
}
