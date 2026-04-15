import type { AgentResponse } from '@src/types/agent'
import type { CreateSessionParams } from '@src/types/session'
import type { IAgentDomain } from '@src/domains/ports/agent'
import type { ISessionDomain } from '@src/domains/ports/session'
import { logger } from '@src/utils/logger'

const GRACEFUL_TERMINATION_PROMPT = `You have reached the operation limit. Please:
1. Summarize what was completed successfully
2. List tasks that could not be completed and the reasons why
Then provide your final response.`

export type AgentRunOptions = {
  allowedTools?: string[]
  disallowedTools?: string[]
  model?: string
  maxTurns?: number
  maxContextTokens?: number
}

export type StartResult = {
  sessionId: string
  response: AgentResponse
}

function getContextTokens(response: AgentResponse): number {
  const u = response.last_assistant_usage
  if (!u) return 0
  return u.input_tokens + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0)
}

export class AgentService {
  constructor(
    private sessionDomain: ISessionDomain,
    private agentDomain: IAgentDomain
  ) {}

  private isLimitExceeded(response: AgentResponse, options: AgentRunOptions): boolean {
    const maxTurns = options.maxTurns ?? -1
    if (maxTurns > 0) {
      const messageCount = response.message_count ?? 0
      if (messageCount >= maxTurns) {
        logger.info(`Turn limit reached: ${messageCount} >= ${maxTurns}`)
        return true
      }
    }

    const maxContextTokens = options.maxContextTokens ?? -1
    if (maxContextTokens > 0) {
      const contextTokens = getContextTokens(response)
      if (contextTokens >= maxContextTokens) {
        logger.info(`Context token limit reached: ${contextTokens} >= ${maxContextTokens}`)
        return true
      }
    }

    return false
  }

  async start(
    task: string,
    createParams: CreateSessionParams,
    options: AgentRunOptions = {}
  ): Promise<StartResult> {
    const session = await this.sessionDomain.create(createParams)
    const sessionFilePath = this.sessionDomain.getPath(session.id)

    const executeOptions = { ...options, sessionFilePath }

    let response = await this.agentDomain.run(session, task, false, executeOptions)

    if (this.isLimitExceeded(response, options)) {
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

  async fork(
    originalSessionId: string,
    instruction: string,
    createParams: CreateSessionParams,
    options: AgentRunOptions = {}
  ): Promise<StartResult> {
    const originalSession = await this.sessionDomain.get(originalSessionId)
    const defaultName = `fork of ${originalSession.name ?? originalSession.id}`
    const newSession = await this.sessionDomain.create({
      ...createParams,
      name: createParams.name ?? defaultName,
      parent_session_id: originalSessionId
    })
    const sessionFilePath = this.sessionDomain.getPath(newSession.id)
    const executeOptions = { ...options, sessionFilePath }

    let response = await this.agentDomain.fork(
      originalSession,
      newSession,
      instruction,
      executeOptions
    )

    if (this.isLimitExceeded(response, options)) {
      response = await this.agentDomain.run(
        newSession,
        GRACEFUL_TERMINATION_PROMPT,
        true,
        executeOptions
      )
    }

    await this.sessionDomain.updateStatus(newSession.id, 'active')

    return { sessionId: newSession.id, response }
  }

  async resume(
    sessionId: string,
    instruction: string,
    options: AgentRunOptions = {}
  ): Promise<AgentResponse> {
    const session = await this.sessionDomain.get(sessionId)
    const sessionFilePath = this.sessionDomain.getPath(session.id)

    const executeOptions = { ...options, sessionFilePath }

    let response = await this.agentDomain.run(session, instruction, true, executeOptions)

    if (this.isLimitExceeded(response, options)) {
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
