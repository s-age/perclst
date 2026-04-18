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
import type { Session } from '@src/types/session'
import type { ISessionDomain } from '@src/domains/ports/session'
import type { IAgentDomain } from '@src/domains/ports/agent'
import type { IScriptDomain, ScriptResult } from '@src/domains/ports/script'
import { PipelineMaxRetriesError } from '@src/errors/pipelineMaxRetriesError'
import { debug } from '@src/utils/output'

const GRACEFUL_TERMINATION_PROMPT = `You have reached the operation limit. Please:
1. Summarize what was completed successfully
2. List tasks that could not be completed and the reasons why
Then provide your final response.`

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

export type PipelineResult = {
  results: PipelineTaskResult[]
}

function getContextTokens(response: AgentResponse): number {
  const u = response.last_assistant_usage
  if (!u) return 0
  return u.input_tokens + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0)
}

function isLimitExceeded(
  response: AgentResponse,
  maxTurns: number,
  maxContextTokens: number
): boolean {
  if (maxTurns > 0 && (response.message_count ?? 0) >= maxTurns) {
    debug.print(`Turn limit reached: ${response.message_count} >= ${maxTurns}`)
    return true
  }
  if (maxContextTokens > 0 && getContextTokens(response) >= maxContextTokens) {
    debug.print(`Context token limit reached`)
    return true
  }
  return false
}

function buildRejectedInstruction(task: AgentPipelineTask, rejected: RejectedContext): string {
  return [
    task.task,
    '',
    `[Retry ${rejected.retry_count}]`,
    'The following script failed. Fix the issues described in the output below:',
    '---',
    rejected.feedback.trim()
  ].join('\n')
}

export class PipelineService {
  constructor(
    private sessionDomain: ISessionDomain,
    private agentDomain: IAgentDomain,
    private scriptDomain: IScriptDomain
  ) {}

  async run(
    pipeline: Pipeline,
    options: PipelineRunOptions = {},
    outerRejection?: RejectedContext
  ): Promise<PipelineResult> {
    const results: PipelineTaskResult[] = []
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
        results.push(result)
        const jumpTo = this.handleAgentRejection(pipeline, task, i, retryCount, pendingRejections)
        if (jumpTo !== undefined) {
          i = jumpTo
          continue
        }
      } else if (task.type === 'pipeline') {
        const rejection = pendingRejections.get(i)
        pendingRejections.delete(i)
        results.push(...(await this.runNestedPipelineTask(task, options, rejection)).results)
      } else {
        const result = await this.runScriptTask(task, i)
        results.push(result)
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

    return { results }
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

  private async runWithLimit(
    session: Session,
    instruction: string,
    isResume: boolean,
    execOpts: ExecuteOptions,
    maxTurns: number,
    maxContextTokens: number
  ): Promise<AgentResponse> {
    let response = await this.agentDomain.run(session, instruction, isResume, execOpts)
    if (isLimitExceeded(response, maxTurns, maxContextTokens)) {
      response = await this.agentDomain.run(session, GRACEFUL_TERMINATION_PROMPT, true, execOpts)
    }
    return response
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
    const instruction = rejected ? buildRejectedInstruction(task, rejected) : task.task

    if (task.name) {
      const existing = await this.sessionDomain.findByName(task.name)
      if (existing) {
        const sessionFilePath = this.sessionDomain.getPath(existing.id)
        const response = await this.runWithLimit(
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
    }

    const session = await this.sessionDomain.create({ name: task.name, procedure: task.procedure })
    const sessionFilePath = this.sessionDomain.getPath(session.id)
    const response = await this.runWithLimit(
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

  private async runNestedPipelineTask(
    task: NestedPipelineTask,
    options: PipelineRunOptions,
    outerRejection?: RejectedContext
  ): Promise<PipelineResult> {
    debug.print(`Running nested pipeline: ${task.name}`)
    return this.run({ tasks: task.tasks }, options, outerRejection)
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
