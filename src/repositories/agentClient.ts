import type { AgentRequest, AgentResponse } from '@src/types/agent'

export type IAgentClient = {
  call(request: AgentRequest): Promise<AgentResponse>
}
