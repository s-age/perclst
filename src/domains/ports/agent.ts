import type { Session } from '@src/types/session'
import type { AgentResponse, ExecuteOptions } from '@src/types/agent'

export type IAgentDomain = {
  run(
    session: Session,
    instruction: string,
    isResume: boolean,
    options?: ExecuteOptions
  ): Promise<AgentResponse>
  fork(
    originalSession: Session,
    newSession: Session,
    instruction: string,
    options?: ExecuteOptions
  ): Promise<AgentResponse>
}
