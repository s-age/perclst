import type { AgentRequest, AgentResponse } from '@src/types/agent'

export interface IAgentClient {
  call(request: AgentRequest): Promise<AgentResponse>
}
