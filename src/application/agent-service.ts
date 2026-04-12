import type { AgentConfig, AgentResponse } from '@src/types/agent'
import { logger } from '@src/lib/utils/logger'
import { DEFAULT_MODEL, DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE } from '@src/constants/config'
import { ISessionRepository } from './ports/session-repository'
import { IProcedureLoader } from './ports/procedure-loader'
import { IAgentClient } from './ports/agent-client'
import { IConfigProvider } from './ports/config-provider'

export type ExecuteOptions = {
  allowedTools?: string[]
  model?: string
}

export class AgentService {
  private config: AgentConfig

  constructor(
    private sessionRepository: ISessionRepository,
    private procedureLoader: IProcedureLoader,
    private agentClient: IAgentClient,
    configProvider: IConfigProvider
  ) {
    const config = configProvider.load()

    this.config = {
      model: config.model || DEFAULT_MODEL,
      max_tokens: config.max_tokens || DEFAULT_MAX_TOKENS,
      temperature: config.temperature || DEFAULT_TEMPERATURE,
      api_key: '' // Not needed for CLI mode
    }
  }

  async execute(
    sessionId: string,
    instruction: string,
    options: ExecuteOptions = {}
  ): Promise<AgentResponse> {
    const session = await this.sessionRepository.load(sessionId)

    let systemPrompt: string | undefined
    if (session.procedure) {
      systemPrompt = this.procedureLoader.load(session.procedure)
      logger.debug('Loaded procedure', { procedure: session.procedure })
    }

    const response = await this.agentClient.call({
      instruction,
      system: systemPrompt,
      config: {
        ...this.config,
        ...(options.model ? { model: options.model } : {}),
        allowedTools: options.allowedTools
      },
      claudeSessionId: session.claude_session_id,
      isResume: false,
      workingDir: session.working_dir,
      sessionFilePath: this.sessionRepository.getSessionPath(sessionId)
    })

    // Update status to active
    const updatedSession = {
      ...session,
      metadata: { ...session.metadata, status: 'active' as const },
      updated_at: new Date().toISOString()
    }
    await this.sessionRepository.save(updatedSession)

    return response
  }

  async resume(
    sessionId: string,
    instruction: string,
    options: ExecuteOptions = {}
  ): Promise<AgentResponse> {
    const session = await this.sessionRepository.load(sessionId)

    let systemPrompt: string | undefined
    if (session.procedure) {
      systemPrompt = this.procedureLoader.load(session.procedure)
      logger.debug('Loaded procedure', { procedure: session.procedure })
    }

    const response = await this.agentClient.call({
      instruction,
      system: systemPrompt,
      config: {
        ...this.config,
        ...(options.model ? { model: options.model } : {}),
        allowedTools: options.allowedTools
      },
      claudeSessionId: session.claude_session_id,
      isResume: true,
      workingDir: session.working_dir,
      sessionFilePath: this.sessionRepository.getSessionPath(sessionId)
    })

    // Update status to active
    const updatedSession = {
      ...session,
      metadata: { ...session.metadata, status: 'active' as const },
      updated_at: new Date().toISOString()
    }
    await this.sessionRepository.save(updatedSession)

    return response
  }
}
