import type { AgentResponse, ExecuteOptions, AgentStreamEvent } from '@src/types/agent'
import type {
  Pipeline,
  AgentPipelineTask,
  ScriptPipelineTask,
  RejectedContext
} from '@src/types/pipeline'
import type { ISessionDomain } from '@src/domains/ports/session'
import type { IPipelineDomain } from '@src/domains/ports/pipeline'
import type { IScriptDomain, ScriptResult } from '@src/domains/ports/script'
import { debug } from '@src/utils/output'

export type PipelineRunOptions = {
  allowedTools?: string[]
  disallowedTools?: string[]
  model?: string
  maxTurns?: number
  maxContextTokens?: number
  onStreamEvent?: (event: AgentStreamEvent) => void
}

export type PipelineTaskResult =
  | {
      kind: 'agent'
      taskIndex: number
      name?: string
      sessionId: string
      response: AgentResponse
      action: 'started' | 'resumed'
    }
  | { kind: 'script'; taskIndex: number; command: string; result: ScriptResult }
  | {
      kind: 'task_start'
      taskIndex: number
      name?: string
      taskType: 'agent' | 'script' | 'pipeline'
    }
  | { kind: 'retry'; taskIndex: number; name?: string; retryCount: number; maxRetries: number }

export class PipelineService {
  constructor(
    private sessionDomain: ISessionDomain,
    private pipelineDomain: IPipelineDomain,
    private scriptDomain: IScriptDomain
  ) {}

  async *run(
    pipeline: Pipeline,
    options: PipelineRunOptions = {},
    outerRejection?: RejectedContext
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
      yield { kind: 'task_start' as const, taskIndex: i, name, taskType: task.type }

      if (task.type === 'agent') {
        const rejection = pendingRejections.get(i)
        pendingRejections.delete(i)
        const jumpTo = yield* this.runAgentStep(
          task,
          i,
          options,
          rejection,
          pipeline,
          retryCount,
          pendingRejections
        )
        if (jumpTo !== undefined) {
          i = jumpTo
          continue
        }
      } else if (task.type === 'pipeline') {
        const rejection = pendingRejections.get(i)
        pendingRejections.delete(i)
        debug.print(`Running nested pipeline: ${task.name}`)
        yield* this.run({ tasks: task.tasks }, options, rejection)
      } else {
        const jumpTo = yield* this.runScriptStep(task, i, pipeline, retryCount, pendingRejections)
        if (jumpTo !== undefined) {
          i = jumpTo
          continue
        }
      }
      i++
    }
  }

  private async *runAgentStep(
    task: AgentPipelineTask,
    i: number,
    options: PipelineRunOptions,
    rejection: RejectedContext | undefined,
    pipeline: Pipeline,
    retryCount: Map<number, number>,
    pendingRejections: Map<number, RejectedContext>
  ): AsyncGenerator<PipelineTaskResult, number | undefined> {
    yield await this.runAgentTask(task, i, options, rejection)
    const jumpTo = await this.handleAgentRejection(pipeline, task, i, retryCount, pendingRejections)
    if (jumpTo !== undefined) {
      yield {
        kind: 'retry' as const,
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
    pipeline: Pipeline,
    retryCount: Map<number, number>,
    pendingRejections: Map<number, RejectedContext>
  ): AsyncGenerator<PipelineTaskResult, number | undefined> {
    const result = await this.runScriptTask(task, i)
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

  private buildExecuteOptions(
    task: AgentPipelineTask,
    options: PipelineRunOptions
  ): ExecuteOptions {
    return {
      allowedTools: task.allowed_tools ?? options.allowedTools,
      disallowedTools: task.disallowed_tools ?? options.disallowedTools,
      model: task.model ?? options.model,
      onStreamEvent: options.onStreamEvent
    }
  }

  private async resumeNamedSession(
    task: AgentPipelineTask,
    index: number,
    instruction: string,
    execOpts: ExecuteOptions,
    maxTurns: number,
    maxContextTokens: number
  ): Promise<(PipelineTaskResult & { kind: 'agent' }) | null> {
    const existing = await this.sessionDomain.findByName(task.name!)
    if (!existing) return null
    const sessionFilePath = this.sessionDomain.getPath(existing.id)
    const response = await this.pipelineDomain.runWithLimit(
      existing,
      instruction,
      true,
      { ...execOpts, sessionFilePath },
      maxTurns,
      maxContextTokens
    )
    await this.sessionDomain.updateStatus(existing.id, 'active')
    return {
      kind: 'agent',
      taskIndex: index,
      name: task.name,
      sessionId: existing.id,
      response,
      action: 'resumed'
    }
  }

  private async runAgentTask(
    task: AgentPipelineTask,
    index: number,
    options: PipelineRunOptions,
    rejected?: RejectedContext
  ): Promise<PipelineTaskResult & { kind: 'agent' }> {
    const maxTurns = task.max_turns ?? options.maxTurns ?? -1
    const maxContextTokens = task.max_context_tokens ?? options.maxContextTokens ?? -1
    const execOpts = this.buildExecuteOptions(task, options)
    const instruction = rejected
      ? this.pipelineDomain.buildRejectedInstruction(task, rejected)
      : task.task

    if (task.name && rejected) {
      const resumed = await this.resumeNamedSession(
        task,
        index,
        instruction,
        execOpts,
        maxTurns,
        maxContextTokens
      )
      if (resumed) return resumed
    }

    const session = await this.sessionDomain.create({ name: task.name, procedure: task.procedure })
    const sessionFilePath = this.sessionDomain.getPath(session.id)
    const response = await this.pipelineDomain.runWithLimit(
      session,
      instruction,
      false,
      { ...execOpts, sessionFilePath },
      maxTurns,
      maxContextTokens
    )
    await this.sessionDomain.updateStatus(session.id, 'active')
    return {
      kind: 'agent',
      taskIndex: index,
      name: task.name,
      sessionId: session.id,
      response,
      action: 'started'
    }
  }

  private async runScriptTask(
    task: ScriptPipelineTask,
    index: number
  ): Promise<PipelineTaskResult & { kind: 'script' }> {
    debug.print(`Running script: ${task.command}`)
    const result = await this.scriptDomain.run(
      task.command,
      this.pipelineDomain.getWorkingDirectory()
    )
    return { kind: 'script', taskIndex: index, command: task.command, result }
  }
}
