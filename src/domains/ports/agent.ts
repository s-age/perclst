import type { Session } from '@src/types/session'
import type { AgentResponse, ExecuteOptions, AgentRunOptions } from '@src/types/agent'

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
  resume(session: Session, instruction: string, options?: ExecuteOptions): Promise<AgentResponse>
  isLimitExceeded(response: AgentResponse, options: AgentRunOptions): boolean
  checkAndNotifyLimit(response: AgentResponse, options: AgentRunOptions): void
  buildChatArgs(session: Session): string[]
  chat(session: Session): void
}
