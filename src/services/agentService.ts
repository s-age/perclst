import type { AgentResponse, AgentRunOptions } from '@src/types/agent'
import type { CreateSessionParams } from '@src/types/session'
import type { IAgentDomain } from '@src/domains/ports/agent'
import type { ISessionDomain } from '@src/domains/ports/session'

export type { AgentRunOptions }

const GRACEFUL_TERMINATION_PROMPT = `You have reached the operation limit. Please:
1. Summarize what was completed successfully
2. List tasks that could not be completed and the reasons why
Then provide your final response.`

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
    const executeOptions = { ...options, sessionFilePath }

    let response = await this.agentDomain.run(session, task, false, executeOptions)

    if (this.agentDomain.isLimitExceeded(response, options)) {
      response = await this.agentDomain.run(
        session,
        GRACEFUL_TERMINATION_PROMPT,
        true,
        executeOptions
      )
    }

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
    const executeOptions = { ...options, sessionFilePath }

    let response = await this.agentDomain.resume(session, instruction, executeOptions)
    await this.sessionDomain.save(session)

    if (this.agentDomain.isLimitExceeded(response, options)) {
      response = await this.agentDomain.run(
        session,
        GRACEFUL_TERMINATION_PROMPT,
        true,
        executeOptions
      )
    }

    await this.sessionDomain.updateStatus(session.id, 'active')
    return response
  }
}
