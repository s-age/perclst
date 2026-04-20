import type { AgentResponse, ExecuteOptions } from '@src/types/agent'
import type {
  AgentPipelineTask,
  Pipeline,
  PipelineRunOptions,
  RejectedContext,
  ScriptPipelineTask
} from '@src/types/pipeline'
import type { Session } from '@src/types/session'
import type { ScriptResult } from '@src/domains/ports/script'

export type RejectionResult = {
  targetIndex: number
  context: RejectedContext
  newCount: number
}

export type AgentTaskResult = {
  taskPath: number[]
  taskIndex: number
  name?: string
  sessionId: string
  response: AgentResponse
  action: 'started' | 'resumed'
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
  buildExecuteOptions(task: AgentPipelineTask, options: PipelineRunOptions): ExecuteOptions
  runAgentTask(
    task: AgentPipelineTask,
    index: number,
    taskPath: number[],
    options: PipelineRunOptions,
    rejected?: RejectedContext
  ): Promise<AgentTaskResult>
  findOuterRejectionTarget(pipeline: Pipeline): number | undefined
  resolveScriptRejection(
    pipeline: Pipeline,
    task: ScriptPipelineTask,
    result: ScriptResult,
    taskIndex: number,
    currentCount: number
  ): RejectionResult | undefined
}
