import { ConfigResolver } from '../config/resolver.js'
import { SessionManager } from '../session/manager.js'
import { ClaudeClient } from './claude.js'
import { ProcedureLoader } from '../procedure/loader.js'
import { Session, Turn } from '../session/types.js'
import { AgentConfig, Message } from './types.js'
import { ConfigError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'

export class AgentExecutor {
  private sessionManager: SessionManager
  private procedureLoader: ProcedureLoader
  private config: AgentConfig

  constructor() {
    this.sessionManager = new SessionManager()
    this.procedureLoader = new ProcedureLoader()

    const config = ConfigResolver.load()
    const apiKey = process.env[config.api_key_env || 'ANTHROPIC_API_KEY']

    if (!apiKey) {
      throw new ConfigError(
        `API key not found in environment variable: ${config.api_key_env || 'ANTHROPIC_API_KEY'}`
      )
    }

    this.config = {
      model: config.model || 'claude-sonnet-4-5',
      max_tokens: config.max_tokens || 8000,
      temperature: config.temperature || 0.7,
      api_key: apiKey
    }
  }

  async execute(sessionId: string): Promise<Session> {
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
      content: turn.content
    }))

    // Call Claude API
    const client = new ClaudeClient(this.config.api_key)
    const response = await client.call({
      messages,
      system: systemPrompt,
      config: this.config
    })

    // Add assistant response to session
    const assistantTurn: Turn = {
      role: 'assistant',
      content: response.content,
      timestamp: new Date().toISOString(),
      model: response.model,
      usage: response.usage
    }

    await this.sessionManager.addTurn(sessionId, assistantTurn)

    return await this.sessionManager.get(sessionId)
  }

  async resume(sessionId: string, instruction: string): Promise<Session> {
    // Add user instruction
    const userTurn: Turn = {
      role: 'user',
      content: instruction,
      timestamp: new Date().toISOString()
    }

    await this.sessionManager.addTurn(sessionId, userTurn)

    // Execute
    return await this.execute(sessionId)
  }
}
