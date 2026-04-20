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

const GRACEFUL_TERMINATION_PROMPT = `You have reached the operation limit. Please:
1. Summarize what was completed successfully
2. List tasks that could not be completed and the reasons why
Then provide your final response.`

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
    toName: string,
    taskIndex: number,
    currentCount: number,
    maxRetries: number,
    feedback: string
  ): RejectionResult {
    const newCount = currentCount + 1
    if (newCount > maxRetries) throw new PipelineMaxRetriesError(taskIndex, maxRetries)

    const targetIndex = pipeline.tasks.findIndex(
      (t) => (t.type === 'agent' || t.type === 'pipeline') && t.name === toName
    )
    if (targetIndex === -1) throw new Error(`Rejection target '${toName}' not found in pipeline`)

    const targetTask = pipeline.tasks[targetIndex]
    const task =
      targetTask.type === 'agent'
        ? targetTask
        : (((targetTask as NestedPipelineTask).tasks.find(
            (t) => t.type === 'agent'
          ) as AgentPipelineTask) ?? ({ type: 'agent', task: '' } as AgentPipelineTask))

    debug.print(`Rejecting to '${toName}' (retry ${newCount}/${maxRetries})`)
    return { targetIndex, context: { retry_count: newCount, task, feedback }, newCount }
  }

  async runWithLimit(
    session: Session,
    instruction: string,
    isResume: boolean,
    execOpts: ExecuteOptions,
    maxTurns: number,
    maxContextTokens: number
  ): Promise<AgentResponse> {
    let response = await this.agentDomain.run(session, instruction, isResume, execOpts)
    if (this.isLimitExceeded(response, maxTurns, maxContextTokens)) {
      response = await this.agentDomain.run(session, GRACEFUL_TERMINATION_PROMPT, true, execOpts)
    }
    return response
  }

  buildExecuteOptions(task: AgentPipelineTask, options: PipelineRunOptions): ExecuteOptions {
    return {
      allowedTools: task.allowed_tools ?? options.allowedTools,
      disallowedTools: task.disallowed_tools ?? options.disallowedTools,
      model: task.model ?? options.model,
      onStreamEvent: options.onStreamEvent
    }
  }

  async runAgentTask(
    task: AgentPipelineTask,
    index: number,
    taskPath: number[],
    options: PipelineRunOptions,
    rejected?: RejectedContext
  ): Promise<AgentTaskResult> {
    const maxTurns = task.max_turns ?? options.maxTurns ?? -1
    const maxContextTokens = task.max_context_tokens ?? options.maxContextTokens ?? -1
    const execOpts = this.buildExecuteOptions(task, options)
    const instruction = rejected ? this.buildRejectedInstruction(task, rejected) : task.task

    if (task.name && rejected) {
      const resumed = await this.resumeNamedSession(
        task,
        index,
        taskPath,
        instruction,
        execOpts,
        maxTurns,
        maxContextTokens
      )
      if (resumed) return resumed
    }

    const session = await this.sessionDomain.create({
      name: task.name,
      procedure: task.procedure,
      working_dir: this.getWorkingDirectory()
    })
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
      taskPath,
      taskIndex: index,
      name: task.name,
      sessionId: session.id,
      response,
      action: 'started'
    }
  }

  private async resumeNamedSession(
    task: AgentPipelineTask,
    index: number,
    taskPath: number[],
    instruction: string,
    execOpts: ExecuteOptions,
    maxTurns: number,
    maxContextTokens: number
  ): Promise<AgentTaskResult | null> {
    const existing = await this.sessionDomain.findByName(task.name!)
    if (!existing) return null
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
      taskPath,
      taskIndex: index,
      name: task.name,
      sessionId: existing.id,
      response,
      action: 'resumed'
    }
  }

  private getContextTokens(response: AgentResponse): number {
    const u = response.last_assistant_usage
    if (!u) return 0
    return u.input_tokens + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0)
  }

  private isLimitExceeded(
    response: AgentResponse,
    maxTurns: number,
    maxContextTokens: number
  ): boolean {
    if (maxTurns > 0 && (response.message_count ?? 0) >= maxTurns) {
      debug.print(`Turn limit reached: ${response.message_count} >= ${maxTurns}`)
      return true
    }
    if (maxContextTokens > 0 && this.getContextTokens(response) >= maxContextTokens) {
      debug.print(`Context token limit reached`)
      return true
    }
    return false
  }

  findOuterRejectionTarget(pipeline: Pipeline): number | undefined {
    const index = pipeline.tasks.findIndex((t) => t.type === 'agent')
    return index !== -1 ? index : undefined
  }

  resolveScriptRejection(
    pipeline: Pipeline,
    task: ScriptPipelineTask,
    result: ScriptResult,
    taskIndex: number,
    currentCount: number
  ): RejectionResult | undefined {
    if (result.exitCode === 0 || !task.rejected) return undefined
    const feedback = [result.stdout, result.stderr].filter(Boolean).join('\n')
    return this.resolveRejection(
      pipeline,
      task.rejected.to,
      taskIndex,
      currentCount,
      task.rejected.max_retries ?? 1,
      feedback
    )
  }
}
