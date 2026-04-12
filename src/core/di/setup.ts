import { container } from './container'
import { TOKENS } from './identifiers'
import { loadConfig, resolveSessionsDir } from '@src/repositories/config'
import { SessionDomain } from '@src/domains/session'
import { AgentDomain } from '@src/domains/agent'
import { AnalyzeDomain } from '@src/domains/analyze'
import { SessionService } from '@src/services/sessionService'
import { AgentService } from '@src/services/agentService'
import { AnalyzeService } from '@src/services/analyzeService'
import { ClaudeCodeRepository } from '@src/infrastructures/claudeCode'
import { DEFAULT_MODEL } from '@src/constants/config'

export function setupContainer(): void {
  const config = loadConfig()
  const sessionsDir = resolveSessionsDir(config)
  const model = config.model ?? DEFAULT_MODEL

  const claudeCodeRepo = new ClaudeCodeRepository()
  const sessionDomain = new SessionDomain(sessionsDir)
  const agentDomain = new AgentDomain(model, claudeCodeRepo)
  const analyzeDomain = new AnalyzeDomain(sessionDomain)

  container.register(TOKENS.Config, config)
  container.register(TOKENS.ClaudeCodeRepository, claudeCodeRepo)
  container.register(TOKENS.SessionDomain, sessionDomain)
  container.register(TOKENS.AgentDomain, agentDomain)
  container.register(TOKENS.AnalyzeDomain, analyzeDomain)

  container.register(TOKENS.SessionService, new SessionService(sessionDomain))
  container.register(TOKENS.AgentService, new AgentService(sessionDomain, agentDomain))
  container.register(TOKENS.AnalyzeService, new AnalyzeService(analyzeDomain))
}
