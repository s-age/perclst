import { ConfigResolver } from '@src/lib/config/resolver'
import { SessionManager } from '@src/lib/session/manager'
import { ClaudeCLI } from './claude-cli'
import { ProcedureLoader } from '@src/lib/procedure/loader'
import type { AgentConfig, AgentResponse } from '@types/agent'
import { logger } from '@src/lib/utils/logger'
import { DEFAULT_MODEL, DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE } from '@src/constants/config'

export interface ExecuteOptions {
  allowedTools?: string[]
  model?: string
}

export class AgentExecutor {
  private sessionManager: SessionManager
  private procedureLoader: ProcedureLoader
  private config: AgentConfig

  constructor() {
    this.sessionManager = new SessionManager()
    this.procedureLoader = new ProcedureLoader()

    const config = ConfigResolver.load()

    this.config = {
      model: config.model || DEFAULT_MODEL,
      max_tokens: config.max_tokens || DEFAULT_MAX_TOKENS,
      temperature: config.temperature || DEFAULT_TEMPERATURE,
      api_key: '', // Not needed for CLI mode
    }
  }

  async execute(sessionId: string, instruction: string, options: ExecuteOptions = {}): Promise<AgentResponse> {
    const session = await this.sessionManager.get(sessionId)

    // Load procedure if specified
    let systemPrompt: string | undefined
    if (session.procedure) {
      systemPrompt = this.procedureLoader.load(session.procedure)
      logger.debug('Loaded procedure', { procedure: session.procedure })
    }

    const client = new ClaudeCLI()
    const response = await client.call({
      instruction,
      system: systemPrompt,
      config: {
        ...this.config,
        ...(options.model ? { model: options.model } : {}),
        allowedTools: options.allowedTools,
      },
      claudeSessionId: session.claude_session_id,
      isResume: false,
      workingDir: session.working_dir,
      sessionFilePath: this.sessionManager.getPath(sessionId),
    })

    await this.sessionManager.updateStatus(sessionId, 'active')

    return response
  }

  async resume(sessionId: string, instruction: string, options: ExecuteOptions = {}): Promise<AgentResponse> {
    const session = await this.sessionManager.get(sessionId)

    // Load procedure if specified
    let systemPrompt: string | undefined
    if (session.procedure) {
      systemPrompt = this.procedureLoader.load(session.procedure)
      logger.debug('Loaded procedure', { procedure: session.procedure })
    }

    const client = new ClaudeCLI()
    const response = await client.call({
      instruction,
      system: systemPrompt,
      config: {
        ...this.config,
        ...(options.model ? { model: options.model } : {}),
        allowedTools: options.allowedTools,
      },
      claudeSessionId: session.claude_session_id,
      isResume: true,
      workingDir: session.working_dir,
      sessionFilePath: this.sessionManager.getPath(sessionId),
    })

    await this.sessionManager.updateStatus(sessionId, 'active')

    return response
  }
}
