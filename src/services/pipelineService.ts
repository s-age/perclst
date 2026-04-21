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
      const task = pipeline.tasks[i]
      if (task.done) {
        i++
        continue
      }
      debug.print(`Pipeline task ${i + 1}/${pipeline.tasks.length}`, { type: task.type })
      const name = task.type !== 'script' ? task.name : undefined
      yield { kind: 'task_start' as const, taskPath, taskIndex: i, name, taskType: task.type }

      const rejection = pendingRejections.get(i)
      pendingRejections.delete(i)
      let jumpTo: number | undefined
      if (task.type === 'agent') {
        jumpTo = yield* this.runAgentStep(
          task,
          i,
          taskPath,
          options,
          rejection,
          pipeline,
          retryCount,
          pendingRejections
        )
      } else if (task.type === 'pipeline') {
        yield* this.runNestedPipeline(task, i, taskPath, options, rejection)
      } else if (task.type === 'child') {
        yield* this.runChildPipeline(task, i, taskPath, options, rejection)
      } else {
        jumpTo = yield* this.runScriptStep(
          task,
          i,
          taskPath,
          pipeline,
          retryCount,
          pendingRejections
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
    i: number,
    taskPath: number[],
    options: PipelineRunOptions,
    rejection: RejectedContext | undefined
  ): AsyncGenerator<PipelineTaskResult> {
    debug.print(`Running nested pipeline: ${task.name}`)
    yield* this.run({ tasks: task.tasks }, options, rejection, [...taskPath, i])
    yield { kind: 'pipeline_end' as const, taskPath, taskIndex: i }
  }

  private async *runChildPipeline(
    task: ChildPipelineTask,
    i: number,
    taskPath: number[],
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
    yield* this.run(childPipeline, childOptions, rejection, [...taskPath, i])
    yield { kind: 'pipeline_end' as const, taskPath, taskIndex: i }
  }

  private async *runAgentStep(
    task: AgentPipelineTask,
    i: number,
    taskPath: number[],
    options: PipelineRunOptions,
    rejection: RejectedContext | undefined,
    pipeline: Pipeline,
    retryCount: Map<number, number>,
    pendingRejections: Map<number, RejectedContext>
  ): AsyncGenerator<PipelineTaskResult, number | undefined> {
    const result = await this.pipelineDomain.runAgentTask(task, i, taskPath, options, rejection)
    yield { kind: 'agent' as const, ...result }
    const jumpTo = await this.handleAgentRejection(pipeline, task, i, retryCount, pendingRejections)
    if (jumpTo !== undefined) {
      yield {
        kind: 'retry' as const,
        taskPath,
        taskIndex: i,
        name: task.name,
        retryCount: retryCount.get(i) ?? 0,
        maxRetries: task.rejected?.max_retries ?? 1
      }
    }
    return jumpTo
  }

  private async *runScriptStep(
    task: ScriptPipelineTask,
    i: number,
    taskPath: number[],
    pipeline: Pipeline,
    retryCount: Map<number, number>,
    pendingRejections: Map<number, RejectedContext>
  ): AsyncGenerator<PipelineTaskResult, number | undefined> {
    const result = await this.runScriptTask(task, i, taskPath)
    yield result
    const jumpTo = await this.handleScriptRejection(
      pipeline,
      task,
      result.result,
      i,
      retryCount,
      pendingRejections
    )
    if (jumpTo !== undefined) {
      yield {
        kind: 'retry' as const,
        taskPath,
        taskIndex: i,
        name: undefined,
        retryCount: retryCount.get(i) ?? 0,
        maxRetries: task.rejected?.max_retries ?? 1
      }
    }
    return jumpTo
  }

  private async handleAgentRejection(
    pipeline: Pipeline,
    task: AgentPipelineTask,
    i: number,
    retryCount: Map<number, number>,
    pendingRejections: Map<number, RejectedContext>
  ): Promise<number | undefined> {
    if (!task.rejected || !task.name) return undefined
    const feedback = await this.pipelineDomain.getRejectionFeedback(task.name)
    if (!feedback) return undefined
    const { targetIndex, context, newCount } = this.pipelineDomain.resolveRejection(
      pipeline,
      task.rejected.to,
      i,
      retryCount.get(i) ?? 0,
      task.rejected.max_retries ?? 1,
      feedback
    )
    retryCount.set(i, newCount)
    pendingRejections.set(targetIndex, context)
    return targetIndex
  }

  private async handleScriptRejection(
    pipeline: Pipeline,
    task: ScriptPipelineTask,
    scriptResult: ScriptResult,
    i: number,
    retryCount: Map<number, number>,
    pendingRejections: Map<number, RejectedContext>
  ): Promise<number | undefined> {
    const rejection = this.pipelineDomain.resolveScriptRejection(
      pipeline,
      task,
      scriptResult,
      i,
      retryCount.get(i) ?? 0
    )
    if (!rejection) return undefined
    retryCount.set(i, rejection.newCount)
    pendingRejections.set(rejection.targetIndex, rejection.context)
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
