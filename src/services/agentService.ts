import type { AgentConfig, AgentResponse } from '@src/types/agent'
import type { Session } from '@src/types/session'
import { logger } from '@src/utils/logger'
import { DEFAULT_MODEL, DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE } from '@src/constants/config'
import type { IProcedureLoader } from '@src/repositories/procedureLoader'
import type { IAgentClient } from '@src/repositories/agentClient'
import type { IConfigProvider } from '@src/types/config'

export type ExecuteOptions = {
  allowedTools?: string[]
  model?: string
  sessionFilePath?: string
}

export class AgentService {
  private config: AgentConfig

  constructor(
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

  async run(
    session: Session,
    instruction: string,
    isResume: boolean,
    options: ExecuteOptions = {}
  ): Promise<AgentResponse> {
    let systemPrompt: string | undefined
    if (session.procedure) {
      systemPrompt = this.procedureLoader.load(session.procedure)
      logger.debug('Loaded procedure', { procedure: session.procedure })
    }

    return this.agentClient.call({
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
      sessionFilePath: options.sessionFilePath
    })
  }
}
