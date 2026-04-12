import { container } from './container'
import { TOKENS } from './identifiers'
import { FileSessionRepository } from '@src/infrastructures/fileSessionRepository'
import { FileConfigProvider } from '@src/infrastructures/fileConfigProvider'
import { FileProcedureLoader } from '@src/infrastructures/fileProcedureLoader'
import { ClaudeApiClient } from '@src/infrastructures/claudeApiClient'
import { ClaudeSessionReader } from '@src/infrastructures/claudeSessionReader'
import { SessionService } from '@src/services/sessionService'
import { AgentService } from '@src/services/agentService'
import { AnalyzeService } from '@src/services/analyzeService'
import { TypeScriptProject } from '@src/mcp/analyzers/project'

export function setupContainer(): void {
  const configProvider = new FileConfigProvider()
  const config = configProvider.load()
  const sessionsDir = configProvider.resolveSessionsDir(config)

  const sessionRepository = new FileSessionRepository(sessionsDir)
  const procedureLoader = new FileProcedureLoader()
  const agentClient = new ClaudeApiClient()
  const claudeSessionReader = new ClaudeSessionReader()
  const tsProject = new TypeScriptProject()

  container.register(TOKENS.ConfigProvider, configProvider)
  container.register(TOKENS.SessionRepository, sessionRepository)
  container.register(TOKENS.ProcedureLoader, procedureLoader)
  container.register(TOKENS.AgentClient, agentClient)
  container.register(TOKENS.ClaudeSessionReader, claudeSessionReader)
  container.register(TOKENS.TypeScriptProject, tsProject)

  // Register services
  container.register(TOKENS.SessionService, new SessionService(sessionRepository))
  container.register(
    TOKENS.AgentService,
    new AgentService(procedureLoader, agentClient, configProvider)
  )
  container.register(
    TOKENS.AnalyzeService,
    new AnalyzeService(sessionRepository, claudeSessionReader)
  )
}
