import { randomUUID } from 'crypto'
import type { AgentConfig, AgentResponse } from '@src/types/agent'
import type { Session, CreateSessionParams } from '@src/types/session'
import { logger } from '@src/utils/logger'
import { DEFAULT_MODEL, DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE } from '@src/constants/config'
import type { ISessionRepository } from '@src/repositories/sessionRepository'
import type { IProcedureLoader } from '@src/repositories/procedureLoader'
import type { IAgentClient } from '@src/repositories/agentClient'
import type { IConfigProvider } from '@src/types/config'

export type ExecuteOptions = {
  allowedTools?: string[]
  model?: string
}

export type StartResult = {
  sessionId: string
  response: AgentResponse
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

  async start(
    task: string,
    params: CreateSessionParams = {},
    options: ExecuteOptions = {}
  ): Promise<StartResult> {
    const id = randomUUID()
    const session: Session = {
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      procedure: params.procedure,
      claude_session_id: id,
      working_dir: process.cwd(),
      metadata: {
        parent_session_id: params.parent_session_id,
        tags: params.tags ?? [],
        status: 'active'
      }
    }
    await this.sessionRepository.save(session)
    logger.info('Session created', { session_id: id })

    const response = await this.runSession(session, task, false, options)
    return { sessionId: id, response }
  }

  async execute(
    sessionId: string,
    instruction: string,
    options: ExecuteOptions = {}
  ): Promise<AgentResponse> {
    const session = await this.sessionRepository.load(sessionId)
    return this.runSession(session, instruction, false, options)
  }

  async resume(
    sessionId: string,
    instruction: string,
    options: ExecuteOptions = {}
  ): Promise<AgentResponse> {
    const session = await this.sessionRepository.load(sessionId)
    return this.runSession(session, instruction, true, options)
  }

  private async runSession(
    session: Session,
    instruction: string,
    isResume: boolean,
    options: ExecuteOptions
  ): Promise<AgentResponse> {
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
      isResume,
      workingDir: session.working_dir,
      sessionFilePath: this.sessionRepository.getSessionPath(session.id)
    })

    const updatedSession = {
      ...session,
      metadata: { ...session.metadata, status: 'active' as const },
      updated_at: new Date().toISOString()
    }
    await this.sessionRepository.save(updatedSession)

    return response
  }
}
