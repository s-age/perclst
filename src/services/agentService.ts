import type { AgentResponse } from '@src/types/agent'
import type { CreateSessionParams } from '@src/types/session'
import type { IAgentDomain } from '@src/domains/agent'
import type { ISessionDomain } from '@src/domains/session'

export type AgentRunOptions = {
  allowedTools?: string[]
  model?: string
}

export type StartResult = {
  sessionId: string
  response: AgentResponse
}

export class AgentService {
  constructor(
    private sessionDomain: ISessionDomain,
    private agentDomain: IAgentDomain
  ) {}

  async start(
    task: string,
    createParams: CreateSessionParams,
    options: AgentRunOptions = {}
  ): Promise<StartResult> {
    const session = await this.sessionDomain.create(createParams)
    const sessionFilePath = this.sessionDomain.getPath(session.id)

    const response = await this.agentDomain.run(session, task, false, {
      ...options,
      sessionFilePath
    })

    await this.sessionDomain.updateStatus(session.id, 'active')

    return { sessionId: session.id, response }
  }

  async resume(
    sessionId: string,
    instruction: string,
    options: AgentRunOptions = {}
  ): Promise<AgentResponse> {
    const session = await this.sessionDomain.get(sessionId)
    const sessionFilePath = this.sessionDomain.getPath(session.id)

    const response = await this.agentDomain.run(session, instruction, true, {
      ...options,
      sessionFilePath
    })

    await this.sessionDomain.updateStatus(session.id, 'active')

    return response
  }
}
