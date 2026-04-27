import type { AgentResponse, AgentRunOptions } from '@src/types/agent'
import type { CreateSessionParams } from '@src/types/session'
import type { Config } from '@src/types/config'
import type { IAgentDomain } from '@src/domains/ports/agent'
import type { ISessionDomain } from '@src/domains/ports/session'

export type { AgentRunOptions }

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
      maxMessages: options.maxMessages ?? this.config.limits?.max_messages ?? -1,
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

    await this.sessionDomain.updateStatus(session.id, 'active')

    try {
      const response = await this.agentDomain.run(session, task, false, executeOptions)

      if (this.agentDomain.isLimitExceeded(response, resolved)) {
        resolved.onLimitExceeded?.()
      }

      await this.sessionDomain.updateStatus(session.id, 'completed')
      return { sessionId: session.id, response }
    } catch (error) {
      await this.sessionDomain.updateStatus(session.id, 'failed').catch(() => {})
      throw error
    }
  }

  async chat(sessionId: string): Promise<void> {
    const session = await this.sessionDomain.get(sessionId)
    this.agentDomain.chat(session)
    await this.sessionDomain.save(session)
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

    await this.sessionDomain.updateStatus(session.id, 'active')

    try {
      const response = await this.agentDomain.resume(session, instruction, executeOptions)

      if (this.agentDomain.isLimitExceeded(response, resolved)) {
        resolved.onLimitExceeded?.()
      }

      await this.sessionDomain.updateStatus(session.id, 'completed')
      await this.sessionDomain.save(session)
      return response
    } catch (error) {
      await this.sessionDomain.updateStatus(session.id, 'failed').catch(() => {})
      throw error
    }
  }
}
