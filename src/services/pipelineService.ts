import { existsSync, readFileSync, unlinkSync } from 'fs'
import { resolve } from 'path'
import type { AgentResponse, ExecuteOptions } from '@src/types/agent'
import type {
  Pipeline,
  AgentPipelineTask,
  ScriptPipelineTask,
  NestedPipelineTask,
  RejectedContext
} from '@src/types/pipeline'
import type { ISessionDomain } from '@src/domains/ports/session'
import type { IPipelineDomain } from '@src/domains/ports/pipeline'
import type { IScriptDomain, ScriptResult } from '@src/domains/ports/script'
import { PipelineMaxRetriesError } from '@src/errors/pipelineMaxRetriesError'
import { debug } from '@src/utils/output'

export type PipelineRunOptions = {
  allowedTools?: string[]
  disallowedTools?: string[]
  model?: string
  maxTurns?: number
  maxContextTokens?: number
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

      if (task.type === 'agent') {
        const rejection = pendingRejections.get(i)
        pendingRejections.delete(i)
        const result = await this.runAgentTask(task, i, options, rejection)
        yield result
        const jumpTo = this.handleAgentRejection(pipeline, task, i, retryCount, pendingRejections)
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
        const result = await this.runScriptTask(task, i)
        yield result
        const jumpTo = this.handleScriptRejection(
          pipeline,
          task,
          result.result,
          i,
          retryCount,
          pendingRejections
        )
        if (jumpTo !== undefined) {
          i = jumpTo
          continue
        }
      }
      i++
    }
  }

  private handleAgentRejection(
    pipeline: Pipeline,
    task: AgentPipelineTask,
    i: number,
    retryCount: Map<number, number>,
    pendingRejections: Map<number, RejectedContext>
  ): number | undefined {
    if (!task.rejected || !task.name) return undefined
    const tmpPath = resolve(`.claude/tmp/${task.name}`)
    if (!existsSync(tmpPath)) return undefined

    const rejectCount = (retryCount.get(i) ?? 0) + 1
    const maxRetries = task.rejected.max_retries ?? 1
    if (rejectCount > maxRetries) throw new PipelineMaxRetriesError(i, maxRetries)

    const feedback = readFileSync(tmpPath, 'utf-8')
    unlinkSync(tmpPath)

    const targetIndex = pipeline.tasks.findIndex(
      (t) => (t.type === 'agent' || t.type === 'pipeline') && t.name === task.rejected!.to
    )
    if (targetIndex === -1)
      throw new Error(`Rejection target '${task.rejected.to}' not found in pipeline`)

    const targetTask = pipeline.tasks[targetIndex]
    retryCount.set(i, rejectCount)
    pendingRejections.set(targetIndex, {
      retry_count: rejectCount,
      task:
        targetTask.type === 'agent'
          ? targetTask
          : (((targetTask as NestedPipelineTask).tasks.find(
              (t) => t.type === 'agent'
            ) as AgentPipelineTask) ?? ({ type: 'agent', task: '' } as AgentPipelineTask)),
      feedback
    })
    debug.print(
      `Agent rejected — rejecting to '${task.rejected.to}' (retry ${rejectCount}/${maxRetries})`
    )
    return targetIndex
  }

  private handleScriptRejection(
    pipeline: Pipeline,
    task: ScriptPipelineTask,
    scriptResult: ScriptResult,
    i: number,
    retryCount: Map<number, number>,
    pendingRejections: Map<number, RejectedContext>
  ): number | undefined {
    if (scriptResult.exitCode === 0 || !task.rejected) return undefined

    const count = (retryCount.get(i) ?? 0) + 1
    const maxRetries = task.rejected.max_retries ?? 1
    if (count > maxRetries) throw new PipelineMaxRetriesError(i, maxRetries)

    const targetIndex = pipeline.tasks.findIndex(
      (t) => (t.type === 'agent' || t.type === 'pipeline') && t.name === task.rejected!.to
    )
    if (targetIndex === -1)
      throw new Error(`Rejection target '${task.rejected.to}' not found in pipeline`)

    const targetTask = pipeline.tasks[targetIndex]
    const feedback = [scriptResult.stdout, scriptResult.stderr].filter(Boolean).join('\n')
    retryCount.set(i, count)
    pendingRejections.set(targetIndex, {
      retry_count: count,
      task:
        targetTask.type === 'agent'
          ? targetTask
          : (((targetTask as NestedPipelineTask).tasks.find(
              (t) => t.type === 'agent'
            ) as AgentPipelineTask) ?? ({ type: 'agent', task: '' } as AgentPipelineTask)),
      feedback
    })
    debug.print(`Script failed — rejecting to '${task.rejected.to}' (retry ${count}/${maxRetries})`)
    return targetIndex
  }

  private buildExecuteOptions(
    task: AgentPipelineTask,
    options: PipelineRunOptions
  ): ExecuteOptions {
    return {
      allowedTools: task.allowed_tools ?? options.allowedTools,
      disallowedTools: task.disallowed_tools ?? options.disallowedTools,
      model: task.model ?? options.model
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

    if (task.name) {
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
    const result = await this.scriptDomain.run(task.command, process.cwd())
    return { kind: 'script', taskIndex: index, command: task.command, result }
  }
}
