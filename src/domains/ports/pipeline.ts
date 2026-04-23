import type { ExecuteOptions } from '@src/types/agent'
import type {
  AgentPipelineTask,
  Pipeline,
  PipelineRunOptions,
  RejectedContext,
  ScriptPipelineTask
} from '@src/types/pipeline'
import type { AgentResponse } from '@src/types/agent'
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
  buildRejectedInstruction(task: AgentPipelineTask, rejected: RejectedContext): string
  getRejectionFeedback(taskName: string): Promise<string | undefined>
  getWorkingDirectory(): string
  resolveRejection(
    pipeline: Pipeline,
    target: { toName: string; feedback: string },
    retryState: { taskIndex: number; currentCount: number; maxRetries: number }
  ): RejectionResult
  buildExecuteOptions(task: AgentPipelineTask, options: PipelineRunOptions): ExecuteOptions
  runAgentTask(
    task: AgentPipelineTask,
    taskLocation: { index: number; taskPath: number[] },
    options: PipelineRunOptions,
    rejected?: RejectedContext
  ): Promise<AgentTaskResult>
  findOuterRejectionTarget(pipeline: Pipeline): number | undefined
  resolveScriptRejection(
    pipeline: Pipeline,
    task: ScriptPipelineTask,
    result: ScriptResult,
    retryState: { taskIndex: number; currentCount: number }
  ): RejectionResult | undefined
}
