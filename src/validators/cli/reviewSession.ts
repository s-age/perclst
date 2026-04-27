import { schema, safeParse } from '../schema'
import { stringRule } from '../rules/string'

const reviewSchema = schema({
  targetPath: stringRule().optional(),
  output: stringRule().optional(),
  prompt: stringRule().optional()
})

export type ReviewSessionInput = typeof reviewSchema._output

export function parseReviewSession(raw: unknown): ReviewSessionInput {
  return safeParse(reviewSchema, raw)
}
