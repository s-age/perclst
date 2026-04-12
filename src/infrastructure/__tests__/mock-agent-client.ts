import { IAgentClient } from '@src/application/ports/agent-client'
import { AgentRequest, AgentResponse } from '@src/types/agent'

export class MockAgentClient implements IAgentClient {
  public lastRequest?: AgentRequest
  public response: AgentResponse = {
    content: 'Mock response',
    model: 'mock-model',
    usage: { input_tokens: 10, output_tokens: 10 }
  }

  async call(request: AgentRequest): Promise<AgentResponse> {
    this.lastRequest = request
    return this.response
  }
}
