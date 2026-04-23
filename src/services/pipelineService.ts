import { resolve, dirname } from 'path'
import type {
  Pipeline,
  AgentPipelineTask,
  ScriptPipelineTask,
  NestedPipelineTask,
  ChildPipelineTask,
  PipelineRunOptions,
  RejectedContext
} from '@src/types/pipeline'
import type { AgentResponse } from '@src/types/agent'
import type { IPipelineDomain } from '@src/domains/ports/pipeline'
import type { IScriptDomain, ScriptResult } from '@src/domains/ports/script'
import { debug } from '@src/utils/output'
import { PipelineAbortedError } from '@src/errors/pipelineAbortedError'

export type { PipelineRunOptions } from '@src/types/pipeline'

export type PipelineTaskResult =
  | {
      kind: 'agent'
      taskPath: number[]
      taskIndex: number
      name?: string
      sessionId: string
      response: AgentResponse
      action: 'started' | 'resumed'
    }
  | { kind: 'script'; taskPath: number[]; taskIndex: number; command: string; result: ScriptResult }
  | {
      kind: 'task_start'
      taskPath: number[]
      taskIndex: number
      name?: string
      taskType: 'agent' | 'script' | 'pipeline' | 'child'
      childPath?: string
    }
  | {
      kind: 'retry'
      taskPath: number[]
      taskIndex: number
      name?: string
      retryCount: number
      maxRetries: number
    }
  | { kind: 'pipeline_end'; taskPath: number[]; taskIndex: number }

export class PipelineService {
  constructor(
    private pipelineDomain: IPipelineDomain,
    private scriptDomain: IScriptDomain
  ) {}

  async *run(
    pipeline: Pipeline,
    options: PipelineRunOptions = {},
    outerRejection?: RejectedContext,
    taskPath: number[] = []
  ): AsyncGenerator<PipelineTaskResult> {
    const retryCount = new Map<number, number>()
    const pendingRejections = new Map<number, RejectedContext>()
    if (outerRejection) {
      const targetIndex = this.pipelineDomain.findOuterRejectionTarget(pipeline)
      if (targetIndex !== undefined) pendingRejections.set(targetIndex, outerRejection)
    }
    let i = 0
    while (i < pipeline.tasks.length) {
      if (options.signal?.aborted) throw new PipelineAbortedError()
      const task = pipeline.tasks[i]
      if (task.done) {
        i++
        continue
      }
      debug.print(`Pipeline task ${i + 1}/${pipeline.tasks.length}`, { type: task.type })
      const name = task.type !== 'script' ? task.name : undefined
      const childPath = task.type === 'child' ? task.path : undefined
      yield {
        kind: 'task_start' as const,
        taskPath,
        taskIndex: i,
        name,
        taskType: task.type,
        childPath
      }

      const rejection = pendingRejections.get(i)
      pendingRejections.delete(i)
      let jumpTo: number | undefined
      if (task.type === 'agent') {
        jumpTo = yield* this.runAgentStep(task, { i, taskPath }, options, {
          rejection,
          pipeline,
          retryCount,
          pendingRejections
        })
      } else if (task.type === 'pipeline') {
        yield* this.runNestedPipeline(task, { i, taskPath }, options, rejection)
      } else if (task.type === 'child') {
        yield* this.runChildPipeline(task, { i, taskPath }, options, rejection)
      } else {
        jumpTo = yield* this.runScriptStep(
          task,
          { i, taskPath },
          {
            pipeline,
            retryCount,
            pendingRejections
          }
        )
      }
      if (jumpTo === undefined) {
        options.onTaskDone?.(taskPath, i)
      }
      i = jumpTo ?? i + 1
    }
  }

  private async *runNestedPipeline(
    task: NestedPipelineTask,
    taskLocation: { i: number; taskPath: number[] },
    options: PipelineRunOptions,
    rejection: RejectedContext | undefined
  ): AsyncGenerator<PipelineTaskResult> {
    debug.print(`Running nested pipeline: ${task.name}`)
    yield* this.run({ tasks: task.tasks }, options, rejection, [
      ...taskLocation.taskPath,
      taskLocation.i
    ])
    yield {
      kind: 'pipeline_end' as const,
      taskPath: taskLocation.taskPath,
      taskIndex: taskLocation.i
    }
  }

  private async *runChildPipeline(
    task: ChildPipelineTask,
    taskLocation: { i: number; taskPath: number[] },
    options: PipelineRunOptions,
    rejection: RejectedContext | undefined
  ): AsyncGenerator<PipelineTaskResult> {
    if (!options.loadChildPipeline) {
      throw new Error('loadChildPipeline is required for child pipeline tasks')
    }
    const baseDir = options.pipelineDir ?? process.cwd()
    const absolutePath = resolve(baseDir, task.path)
    const childDir = dirname(absolutePath)
    const childPipeline = options.loadChildPipeline(absolutePath)
    const childOptions = { ...options, pipelineDir: childDir }
    yield* this.run(childPipeline, childOptions, rejection, [
      ...taskLocation.taskPath,
      taskLocation.i
    ])
    options.onChildPipelineDone?.(absolutePath)
    yield {
      kind: 'pipeline_end' as const,
      taskPath: taskLocation.taskPath,
      taskIndex: taskLocation.i
    }
  }

  private async *runAgentStep(
    task: AgentPipelineTask,
    taskLocation: { i: number; taskPath: number[] },
    options: PipelineRunOptions,
    rejectionState: {
      rejection: RejectedContext | undefined
      pipeline: Pipeline
      retryCount: Map<number, number>
      pendingRejections: Map<number, RejectedContext>
    }
  ): AsyncGenerator<PipelineTaskResult, number | undefined> {
    const result = await this.pipelineDomain.runAgentTask(
      task,
      { index: taskLocation.i, taskPath: taskLocation.taskPath },
      options,
      rejectionState.rejection
    )
    yield { kind: 'agent' as const, ...result }
    const jumpTo = await this.handleAgentRejection(rejectionState.pipeline, task, taskLocation.i, {
      retryCount: rejectionState.retryCount,
      pendingRejections: rejectionState.pendingRejections
    })
    if (jumpTo !== undefined) {
      yield {
        kind: 'retry' as const,
        taskPath: taskLocation.taskPath,
        taskIndex: taskLocation.i,
        name: task.name,
        retryCount: rejectionState.retryCount.get(taskLocation.i) ?? 0,
        maxRetries: task.rejected?.max_retries ?? 1
      }
    }
    return jumpTo
  }

  private async *runScriptStep(
    task: ScriptPipelineTask,
    taskLocation: { i: number; taskPath: number[] },
    pipelineState: {
      pipeline: Pipeline
      retryCount: Map<number, number>
      pendingRejections: Map<number, RejectedContext>
    }
  ): AsyncGenerator<PipelineTaskResult, number | undefined> {
    const result = await this.runScriptTask(task, taskLocation.i, taskLocation.taskPath)
    yield result
    const jumpTo = await this.handleScriptRejection(
      pipelineState.pipeline,
      task,
      { i: taskLocation.i, scriptResult: result.result },
      { retryCount: pipelineState.retryCount, pendingRejections: pipelineState.pendingRejections }
    )
    if (jumpTo !== undefined) {
      yield {
        kind: 'retry' as const,
        taskPath: taskLocation.taskPath,
        taskIndex: taskLocation.i,
        name: undefined,
        retryCount: pipelineState.retryCount.get(taskLocation.i) ?? 0,
        maxRetries: task.rejected?.max_retries ?? 1
      }
    }
    return jumpTo
  }

  private async handleAgentRejection(
    pipeline: Pipeline,
    task: AgentPipelineTask,
    i: number,
    state: { retryCount: Map<number, number>; pendingRejections: Map<number, RejectedContext> }
  ): Promise<number | undefined> {
    if (!task.rejected || !task.name) return undefined
    const feedback = await this.pipelineDomain.getRejectionFeedback(task.name)
    if (!feedback) return undefined
    const { targetIndex, context, newCount } = this.pipelineDomain.resolveRejection(
      pipeline,
      { toName: task.rejected.to, feedback },
      {
        taskIndex: i,
        currentCount: state.retryCount.get(i) ?? 0,
        maxRetries: task.rejected.max_retries ?? 1
      }
    )
    state.retryCount.set(i, newCount)
    state.pendingRejections.set(targetIndex, context)
    return targetIndex
  }

  private async handleScriptRejection(
    pipeline: Pipeline,
    task: ScriptPipelineTask,
    rejectionInfo: { i: number; scriptResult: ScriptResult },
    state: { retryCount: Map<number, number>; pendingRejections: Map<number, RejectedContext> }
  ): Promise<number | undefined> {
    const rejection = this.pipelineDomain.resolveScriptRejection(
      pipeline,
      task,
      rejectionInfo.scriptResult,
      { taskIndex: rejectionInfo.i, currentCount: state.retryCount.get(rejectionInfo.i) ?? 0 }
    )
    if (!rejection) return undefined
    state.retryCount.set(rejectionInfo.i, rejection.newCount)
    state.pendingRejections.set(rejection.targetIndex, rejection.context)
    return rejection.targetIndex
  }

  private async runScriptTask(
    task: ScriptPipelineTask,
    index: number,
    taskPath: number[]
  ): Promise<PipelineTaskResult & { kind: 'script' }> {
    debug.print(`Running script: ${task.command}`)
    const result = await this.scriptDomain.run(
      task.command,
      this.pipelineDomain.getWorkingDirectory()
    )
    return { kind: 'script', taskPath, taskIndex: index, command: task.command, result }
  }
}
