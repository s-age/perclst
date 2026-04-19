import type {
  Pipeline,
  AgentPipelineTask,
  ScriptPipelineTask,
  NestedPipelineTask,
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
      taskType: 'agent' | 'script' | 'pipeline'
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
      const firstAgentIndex = pipeline.tasks.findIndex((t) => t.type === 'agent')
      if (firstAgentIndex !== -1) pendingRejections.set(firstAgentIndex, outerRejection)
    }
    let i = 0
    while (i < pipeline.tasks.length) {
      const task = pipeline.tasks[i]
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
    if (scriptResult.exitCode === 0 || !task.rejected) return undefined
    const feedback = [scriptResult.stdout, scriptResult.stderr].filter(Boolean).join('\n')
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
