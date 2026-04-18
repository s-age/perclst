import type { AgentResponse, ExecuteOptions } from '@src/types/agent'
import type { AgentPipelineTask, RejectedContext } from '@src/types/pipeline'
import type { Session } from '@src/types/session'

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
}
