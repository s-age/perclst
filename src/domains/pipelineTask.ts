import type { IPipelineTaskDomain } from '@src/domains/ports/pipelineTask'
import type { Pipeline } from '@src/types/pipeline'

export class PipelineTaskDomain implements IPipelineTaskDomain {
  markTaskDone(pipeline: Pipeline, taskPath: number[], taskIndex: number): void {
    if (pipeline.tasks[taskIndex]) pipeline.tasks[taskIndex].done = true
  }
}
