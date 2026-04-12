import { container } from './container'
import { TOKENS } from './identifiers'
import { loadConfig, resolveSessionsDir } from '@src/repositories/config'
import { SessionDomain } from '@src/domains/session'
import { AgentDomain } from '@src/domains/agent'
import { AnalyzeDomain } from '@src/domains/analyze'
import { SessionService } from '@src/services/sessionService'
import { AgentService } from '@src/services/agentService'
import { AnalyzeService } from '@src/services/analyzeService'
import { TypeScriptProject } from '@src/mcp/analyzers/project'
import { DEFAULT_MODEL } from '@src/constants/config'

export function setupContainer(): void {
  const config = loadConfig()
  const sessionsDir = resolveSessionsDir(config)
  const model = config.model ?? DEFAULT_MODEL

  const tsProject = new TypeScriptProject()
  container.register(TOKENS.TypeScriptProject, tsProject)

  const sessionDomain = new SessionDomain(sessionsDir)
  const agentDomain = new AgentDomain(model)
  const analyzeDomain = new AnalyzeDomain(sessionDomain)

  container.register(TOKENS.SessionDomain, sessionDomain)
  container.register(TOKENS.AgentDomain, agentDomain)
  container.register(TOKENS.AnalyzeDomain, analyzeDomain)

  container.register(TOKENS.SessionService, new SessionService(sessionDomain))
  container.register(TOKENS.AgentService, new AgentService(sessionDomain, agentDomain))
  container.register(TOKENS.AnalyzeService, new AnalyzeService(analyzeDomain))
}
