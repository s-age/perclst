import type { Pipeline } from '@src/types/pipeline'

export type IPipelineTaskDomain = {
  markTaskDone(pipeline: Pipeline, taskPath: number[], taskIndex: number): void
}
