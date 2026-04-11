import { ConfigResolver } from '../config/resolver.js'
import { SessionManager } from '../session/manager.js'
import { ClaudeCLI } from './claude-cli.js'
import { ProcedureLoader } from '../procedure/loader.js'
import { Session, Turn } from '../session/types.js'
import { AgentConfig, Message } from './types.js'
import { logger } from '../utils/logger.js'

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
      model: config.model || 'claude-sonnet-4-6',
      max_tokens: config.max_tokens || 8000,
      temperature: config.temperature || 0.7,
      api_key: '', // Not needed for CLI mode
    }
  }

  async execute(sessionId: string, options: ExecuteOptions = {}): Promise<Session> {
    const session = await this.sessionManager.get(sessionId)

    // Load procedure if specified
    let systemPrompt: string | undefined
    if (session.procedure) {
      systemPrompt = this.procedureLoader.load(session.procedure)
      logger.debug('Loaded procedure', { procedure: session.procedure })
    }

    // Build messages from turns
    const messages: Message[] = session.turns.map((turn) => ({
      role: turn.role,
      content: turn.content,
    }))

    // Call Claude CLI
    const client = new ClaudeCLI()
    const response = await client.call({
      messages,
      system: systemPrompt,
      config: {
        ...this.config,
        ...(options.model ? { model: options.model } : {}),
        allowedTools: options.allowedTools,
      },
      sessionFilePath: this.sessionManager.getPath(sessionId),
    })

    // Add assistant response to session
    const assistantTurn: Turn = {
      role: 'assistant',
      content: response.content,
      timestamp: new Date().toISOString(),
      model: response.model,
      usage: response.usage,
      thoughts: response.thoughts,
      tool_history: response.tool_history,
    }

    await this.sessionManager.addTurn(sessionId, assistantTurn)

    return await this.sessionManager.get(sessionId)
  }

  async resume(sessionId: string, instruction: string, options: ExecuteOptions = {}): Promise<Session> {
    // Add user instruction
    const userTurn: Turn = {
      role: 'user',
      content: instruction,
      timestamp: new Date().toISOString(),
    }

    await this.sessionManager.addTurn(sessionId, userTurn)

    // Execute
    return await this.execute(sessionId, options)
  }
}
