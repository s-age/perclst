import type { AgentResponse, ExecuteOptions } from '@src/types/agent'
import type { AgentPipelineTask, Pipeline, RejectedContext } from '@src/types/pipeline'
import type { Session } from '@src/types/session'

export type RejectionResult = {
  targetIndex: number
  context: RejectedContext
  newCount: number
}

export type IPipelineDomain = {
  runWithLimit(
    session: Session,
    instruction: string,
    isResume: boolean,
    execOpts: ExecuteOptions,
    maxTurns: number,
    maxContextTokens: number
  ): Promise<AgentResponse>
  buildRejectedInstruction(task: AgentPipelineTask, rejected: RejectedContext): string
  getRejectionFeedback(taskName: string): Promise<string | undefined>
  getWorkingDirectory(): string
  resolveRejection(
    pipeline: Pipeline,
    toName: string,
    taskIndex: number,
    currentCount: number,
    maxRetries: number,
    feedback: string
  ): RejectionResult
}
