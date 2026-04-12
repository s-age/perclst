import { container } from './container'
import { TOKENS } from './identifiers'
import { FileSessionRepository } from '@src/infrastructure/file-session-repository'
import { FileConfigProvider } from '@src/infrastructure/file-config-provider'
import { FileProcedureLoader } from '@src/infrastructure/file-procedure-loader'
import { ClaudeApiClient } from '@src/infrastructure/claude-api-client'
import { SessionService } from '@src/application/session-service'
import { AgentService } from '@src/application/agent-service'
import { TypeScriptProject } from '@src/mcp/analyzers/project'

export function setupContainer(): void {
  const configProvider = new FileConfigProvider()
  const config = configProvider.load()
  const sessionsDir = configProvider.resolveSessionsDir(config)

  const sessionRepository = new FileSessionRepository(sessionsDir)
  const procedureLoader = new FileProcedureLoader()
  const agentClient = new ClaudeApiClient()
  const tsProject = new TypeScriptProject()

  container.register(TOKENS.ConfigProvider, configProvider)
  container.register(TOKENS.SessionRepository, sessionRepository)
  container.register(TOKENS.ProcedureLoader, procedureLoader)
  container.register(TOKENS.AgentClient, agentClient)
  container.register(TOKENS.TypeScriptProject, tsProject)

  // Register services
  container.register(
    TOKENS.SessionService,
    new SessionService(sessionRepository)
  )
  container.register(
    TOKENS.AgentService,
    new AgentService(sessionRepository, procedureLoader, agentClient, configProvider)
  )
}
