import type { IPipelineTaskDomain } from '@src/domains/ports/pipelineTask'
import type { Pipeline, NestedPipelineTask } from '@src/types/pipeline'

export class PipelineTaskDomain implements IPipelineTaskDomain {
  markTaskDone(pipeline: Pipeline, taskPath: number[], taskIndex: number): void {
    let tasks = pipeline.tasks
    for (const step of taskPath) {
      const parent = tasks[step]
      if (parent.type !== 'pipeline') return
      tasks = (parent as NestedPipelineTask).tasks
    }
    if (tasks[taskIndex]) tasks[taskIndex].done = true
  }
}
