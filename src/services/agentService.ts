import type { AgentResponse, AgentRunOptions } from '@src/types/agent'
import type { CreateSessionParams } from '@src/types/session'
import type { Config } from '@src/types/config'
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
    private agentDomain: IAgentDomain,
    private config: Config = {}
  ) {}

  private resolveRunOptions(options: AgentRunOptions): AgentRunOptions {
    return {
      ...options,
      maxTurns: options.maxTurns ?? this.config.limits?.max_turns ?? -1,
      maxContextTokens: options.maxContextTokens ?? this.config.limits?.max_context_tokens ?? -1,
      allowedTools: options.allowedTools ?? this.config.allowed_tools,
      disallowedTools: options.disallowedTools ?? this.config.disallowed_tools
    }
  }

  async start(
    task: string,
    createParams: CreateSessionParams,
    options: AgentRunOptions = {}
  ): Promise<StartResult> {
    const resolved = this.resolveRunOptions(options)
    const session = await this.sessionDomain.create(createParams)
    const sessionFilePath = this.sessionDomain.getPath(session.id)
    const executeOptions = { ...resolved, sessionFilePath }

    let response = await this.agentDomain.run(session, task, false, executeOptions)

    if (this.agentDomain.isLimitExceeded(response, resolved)) {
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
    const resolved = this.resolveRunOptions(options)
    const session = await this.sessionDomain.get(sessionId)
    const sessionFilePath = this.sessionDomain.getPath(session.id)
    const executeOptions = { ...resolved, sessionFilePath }

    let response = await this.agentDomain.resume(session, instruction, executeOptions)
    await this.sessionDomain.save(session)

    if (this.agentDomain.isLimitExceeded(response, resolved)) {
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
