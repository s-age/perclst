import type { AgentResponse, ExecuteOptions } from '@src/types/agent'
import type {
  AgentPipelineTask,
  NestedPipelineTask,
  Pipeline,
  PipelineRunOptions,
  RejectedContext,
  ScriptPipelineTask
} from '@src/types/pipeline'
import type { Session } from '@src/types/session'
import type { IAgentDomain } from '@src/domains/ports/agent'
import type { IPipelineDomain, RejectionResult, AgentTaskResult } from '@src/domains/ports/pipeline'
import type { ScriptResult } from '@src/domains/ports/script'
import type { ISessionDomain } from '@src/domains/ports/session'
import type { IRejectionFeedbackRepository } from '@src/repositories/ports/rejectionFeedback'
import { PipelineMaxRetriesError } from '@src/errors/pipelineMaxRetriesError'
import { debug } from '@src/utils/output'

export class PipelineDomain implements IPipelineDomain {
  constructor(
    private agentDomain: IAgentDomain,
    private sessionDomain: ISessionDomain,
    private rejectionFeedbackRepo: IRejectionFeedbackRepository
  ) {}

  buildRejectedInstruction(task: AgentPipelineTask, rejected: RejectedContext): string {
    return [
      task.task,
      '',
      `[Retry ${rejected.retry_count}]`,
      'The following script failed. Fix the issues described in the output below:',
      '---',
      rejected.feedback.trim()
    ].join('\n')
  }

  async getRejectionFeedback(taskName: string): Promise<string | undefined> {
    return this.rejectionFeedbackRepo.getFeedback(taskName)
  }

  getWorkingDirectory(): string {
    return this.rejectionFeedbackRepo.getCwd()
  }

  resolveRejection(
    pipeline: Pipeline,
    target: { toName: string; feedback: string },
    retryState: { taskIndex: number; currentCount: number; maxRetries: number }
  ): RejectionResult {
    const newCount = retryState.currentCount + 1
    if (newCount > retryState.maxRetries)
      throw new PipelineMaxRetriesError(retryState.taskIndex, retryState.maxRetries)

    const targetIndex = pipeline.tasks.findIndex(
      (t) => (t.type === 'agent' || t.type === 'pipeline') && t.name === target.toName
    )
    if (targetIndex === -1)
      throw new Error(`Rejection target '${target.toName}' not found in pipeline`)

    const targetTask = pipeline.tasks[targetIndex]
    const task =
      targetTask.type === 'agent'
        ? targetTask
        : (((targetTask as NestedPipelineTask).tasks.find(
            (t) => t.type === 'agent'
          ) as AgentPipelineTask) ?? ({ type: 'agent', task: '' } as AgentPipelineTask))

    debug.print(`Rejecting to '${target.toName}' (retry ${newCount}/${retryState.maxRetries})`)
    return {
      targetIndex,
      context: { retry_count: newCount, task, feedback: target.feedback },
      newCount
    }
  }

  private async runWithLimit(
    session: Session,
    instruction: string,
    isResume: boolean,
    config: {
      execOpts: ExecuteOptions
      limits: { maxMessages: number; maxContextTokens: number }
      onLimitExceeded?: () => void
    }
  ): Promise<AgentResponse> {
    const response = await this.agentDomain.run(session, instruction, isResume, config.execOpts)
    if (
      this.agentDomain.isLimitExceeded(response, {
        maxMessages: config.limits.maxMessages,
        maxContextTokens: config.limits.maxContextTokens
      })
    ) {
      config.onLimitExceeded?.()
    }
    return response
  }

  buildExecuteOptions(task: AgentPipelineTask, options: PipelineRunOptions): ExecuteOptions {
    return {
      allowedTools: task.allowed_tools ?? options.allowedTools,
      disallowedTools: task.disallowed_tools ?? options.disallowedTools,
      model: task.model ?? options.model,
      onStreamEvent: options.onStreamEvent,
      signal: options.signal
    }
  }

  async runAgentTask(
    task: AgentPipelineTask,
    taskLocation: { index: number; taskPath: number[] },
    options: PipelineRunOptions,
    rejected?: RejectedContext
  ): Promise<AgentTaskResult> {
    const maxMessages = task.max_messages ?? options.maxMessages ?? -1
    const maxContextTokens = task.max_context_tokens ?? options.maxContextTokens ?? -1
    const execOpts = this.buildExecuteOptions(task, options)
    const instruction = rejected ? this.buildRejectedInstruction(task, rejected) : task.task

    if (task.name) {
      const resumed = await this.resumeNamedSession(task, taskLocation, {
        instruction,
        execOpts,
        limits: { maxMessages, maxContextTokens },
        onLimitExceeded: options.onLimitExceeded
      })
      if (resumed) return resumed
    }

    const session = await this.sessionDomain.create({
      name: task.name,
      procedure: task.procedure,
      labels: task.labels,
      working_dir: this.getWorkingDirectory()
    })
    const sessionFilePath = this.sessionDomain.getPath(session.id)
    const response = await this.runWithLimit(session, instruction, false, {
      execOpts: { ...execOpts, sessionFilePath },
      limits: { maxMessages, maxContextTokens },
      onLimitExceeded: options.onLimitExceeded
    })
    await this.sessionDomain.updateStatus(session.id, 'active')
    return {
      taskPath: taskLocation.taskPath,
      taskIndex: taskLocation.index,
      name: task.name,
      sessionId: session.id,
      response,
      action: 'started'
    }
  }

  private async resumeNamedSession(
    task: AgentPipelineTask,
    taskLocation: { index: number; taskPath: number[] },
    executionConfig: {
      instruction: string
      execOpts: ExecuteOptions
      limits: { maxMessages: number; maxContextTokens: number }
      onLimitExceeded?: () => void
    }
  ): Promise<AgentTaskResult | null> {
    const existing = await this.sessionDomain.findByName(task.name!)
    if (!existing) return null
    const sessionFilePath = this.sessionDomain.getPath(existing.id)
    const response = await this.runWithLimit(existing, executionConfig.instruction, true, {
      execOpts: { ...executionConfig.execOpts, sessionFilePath },
      limits: executionConfig.limits,
      onLimitExceeded: executionConfig.onLimitExceeded
    })
    await this.sessionDomain.updateStatus(existing.id, 'active')
    return {
      taskPath: taskLocation.taskPath,
      taskIndex: taskLocation.index,
      name: task.name,
      sessionId: existing.id,
      response,
      action: 'resumed'
    }
  }

  findOuterRejectionTarget(pipeline: Pipeline): number | undefined {
    const index = pipeline.tasks.findIndex((t) => t.type === 'agent')
    return index !== -1 ? index : undefined
  }

  resolveScriptRejection(
    pipeline: Pipeline,
    task: ScriptPipelineTask,
    result: ScriptResult,
    retryState: { taskIndex: number; currentCount: number }
  ): RejectionResult | undefined {
    if (result.exitCode === 0 || !task.rejected) return undefined
    const feedback = [result.stdout, result.stderr].filter(Boolean).join('\n')
    return this.resolveRejection(
      pipeline,
      { toName: task.rejected.to, feedback },
      {
        taskIndex: retryState.taskIndex,
        currentCount: retryState.currentCount,
        maxRetries: task.rejected.max_retries ?? 1
      }
    )
  }
}
