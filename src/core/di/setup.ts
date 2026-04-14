import { container } from './container'
import { TOKENS } from './identifiers'
import { loadConfig, resolveSessionsDir } from '@src/repositories/config'
import { SessionRepository } from '@src/repositories/sessions'
import { ClaudeSessionRepository } from '@src/repositories/claudeSessions'
import { ProcedureRepository } from '@src/repositories/procedures'
import { SessionDomain } from '@src/domains/session'
import { AgentDomain } from '@src/domains/agent'
import { AnalyzeDomain } from '@src/domains/analyze'
import { ImportDomain } from '@src/domains/import'
import { SessionService } from '@src/services/sessionService'
import { AgentService } from '@src/services/agentService'
import { AnalyzeService } from '@src/services/analyzeService'
import { ImportService } from '@src/services/importService'
import { ClaudeCodeRepository } from '@src/infrastructures/claudeCode'
import { DEFAULT_MODEL } from '@src/constants/config'

export function setupContainer(): void {
  const config = loadConfig()
  const sessionsDir = resolveSessionsDir(config)
  const model = config.model ?? DEFAULT_MODEL

  const claudeCodeRepo = new ClaudeCodeRepository()
  const sessionRepo = new SessionRepository(sessionsDir)
  const claudeSessionRepo = new ClaudeSessionRepository()
  const procedureRepo = new ProcedureRepository()

  const sessionDomain = new SessionDomain(sessionRepo)
  const agentDomain = new AgentDomain(model, claudeCodeRepo, procedureRepo)
  const analyzeDomain = new AnalyzeDomain(sessionDomain, claudeSessionRepo)
  const importDomain = new ImportDomain(claudeSessionRepo)

  container.register(TOKENS.Config, config)
  container.register(TOKENS.ClaudeCodeRepository, claudeCodeRepo)
  container.register(TOKENS.SessionRepository, sessionRepo)
  container.register(TOKENS.ClaudeSessionRepository, claudeSessionRepo)
  container.register(TOKENS.ProcedureRepository, procedureRepo)
  container.register(TOKENS.SessionDomain, sessionDomain)
  container.register(TOKENS.AgentDomain, agentDomain)
  container.register(TOKENS.AnalyzeDomain, analyzeDomain)
  container.register(TOKENS.ImportDomain, importDomain)

  container.register(TOKENS.SessionService, new SessionService(sessionDomain))
  container.register(TOKENS.AgentService, new AgentService(sessionDomain, agentDomain))
  container.register(TOKENS.AnalyzeService, new AnalyzeService(analyzeDomain))
  container.register(TOKENS.ImportService, new ImportService(sessionDomain, importDomain))
}
