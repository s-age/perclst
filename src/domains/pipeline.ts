import type { AgentResponse, ExecuteOptions } from '@src/types/agent'
import type {
  AgentPipelineTask,
  NestedPipelineTask,
  Pipeline,
  RejectedContext
} from '@src/types/pipeline'
import type { Session } from '@src/types/session'
import type { IAgentDomain } from '@src/domains/ports/agent'
import type { IPipelineDomain, RejectionResult } from '@src/domains/ports/pipeline'
import { PipelineMaxRetriesError } from '@src/errors/pipelineMaxRetriesError'
import { getRejectionFeedback, getCwd } from '@src/repositories/rejectionFeedback'
import { debug } from '@src/utils/output'

const GRACEFUL_TERMINATION_PROMPT = `You have reached the operation limit. Please:
1. Summarize what was completed successfully
2. List tasks that could not be completed and the reasons why
Then provide your final response.`

export class PipelineDomain implements IPipelineDomain {
  constructor(private agentDomain: IAgentDomain) {}

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
    return getRejectionFeedback(taskName)
  }

  getWorkingDirectory(): string {
    return getCwd()
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
}
