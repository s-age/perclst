import { container } from './container'
import { TOKENS } from './identifiers'
import { loadConfig, resolveSessionsDir } from '@src/repositories/config'
import { SessionRepository } from '@src/repositories/sessions'
import { ClaudeSessionRepository } from '@src/repositories/claudeSessions'
import { ProcedureRepository } from '@src/repositories/procedures'
import { CheckerRepository } from '@src/repositories/checkerRepository'
import { TestStrategyRepository } from '@src/repositories/testStrategyRepository'
import { SessionDomain } from '@src/domains/session'
import { AgentDomain } from '@src/domains/agent'
import { AnalyzeDomain } from '@src/domains/analyze'
import { ImportDomain } from '@src/domains/import'
import { CheckerDomain } from '@src/domains/checker'
import { TestStrategyDomain } from '@src/domains/testStrategy'
import { SessionService } from '@src/services/sessionService'
import { AgentService } from '@src/services/agentService'
import { AnalyzeService } from '@src/services/analyzeService'
import { ImportService } from '@src/services/importService'
import { CheckerService } from '@src/services/checkerService'
import { TestStrategistService } from '@src/services/testStrategistService'
import { PipelineService } from '@src/services/pipelineService'
import { ClaudeCodeRepository } from '@src/infrastructures/claudeCode'
import { ShellRepository } from '@src/repositories/shell'
import { ScriptDomain } from '@src/domains/script'
import { KnowledgeSearchDomain } from '@src/domains/knowledgeSearch'
import { KnowledgeSearchRepository } from '@src/repositories/knowledgeSearchRepository'
import { KnowledgeSearchService } from '@src/services/knowledgeSearchService'
import { TsAnalysisRepository } from '@src/repositories/tsAnalysisRepository'
import { TsAnalysisDomain } from '@src/domains/tsAnalysis'
import { TsAnalysisService } from '@src/services/tsAnalysisService'
import { DEFAULT_MODEL } from '@src/constants/config'

export function setupContainer(): void {
  const config = loadConfig()
  const sessionsDir = resolveSessionsDir(config)
  const model = config.model ?? DEFAULT_MODEL

  const claudeCodeRepo = new ClaudeCodeRepository()
  const shellRepo = new ShellRepository()
  const sessionRepo = new SessionRepository(sessionsDir)
  const claudeSessionRepo = new ClaudeSessionRepository()
  const procedureRepo = new ProcedureRepository()
  const checkerRepo = new CheckerRepository()
  const testStrategyRepo = new TestStrategyRepository()
  const knowledgeSearchRepo = new KnowledgeSearchRepository()
  const tsAnalysisRepo = new TsAnalysisRepository()

  const scriptDomain = new ScriptDomain(shellRepo)
  const sessionDomain = new SessionDomain(sessionRepo)
  const agentDomain = new AgentDomain(model, claudeCodeRepo, procedureRepo)
  const analyzeDomain = new AnalyzeDomain(sessionDomain, claudeSessionRepo)
  const importDomain = new ImportDomain(claudeSessionRepo)
  const checkerDomain = new CheckerDomain(checkerRepo)
  const testStrategyDomain = new TestStrategyDomain(testStrategyRepo)
  const knowledgeSearchDomain = new KnowledgeSearchDomain(knowledgeSearchRepo)
  const tsAnalysisDomain = new TsAnalysisDomain(tsAnalysisRepo)

  container.register(TOKENS.Config, config)
  container.register(TOKENS.ShellRepository, shellRepo)
  container.register(TOKENS.ClaudeCodeRepository, claudeCodeRepo)
  container.register(TOKENS.SessionRepository, sessionRepo)
  container.register(TOKENS.ClaudeSessionRepository, claudeSessionRepo)
  container.register(TOKENS.ProcedureRepository, procedureRepo)
  container.register(TOKENS.CheckerRepository, checkerRepo)
  container.register(TOKENS.TestStrategyRepository, testStrategyRepo)
  container.register(TOKENS.KnowledgeSearchRepository, knowledgeSearchRepo)
  container.register(TOKENS.TsAnalysisRepository, tsAnalysisRepo)
  container.register(TOKENS.ScriptDomain, scriptDomain)
  container.register(TOKENS.SessionDomain, sessionDomain)
  container.register(TOKENS.AgentDomain, agentDomain)
  container.register(TOKENS.AnalyzeDomain, analyzeDomain)
  container.register(TOKENS.ImportDomain, importDomain)
  container.register(TOKENS.CheckerDomain, checkerDomain)
  container.register(TOKENS.TestStrategyDomain, testStrategyDomain)
  container.register(TOKENS.KnowledgeSearchDomain, knowledgeSearchDomain)
  container.register(TOKENS.TsAnalysisDomain, tsAnalysisDomain)

  container.register(TOKENS.SessionService, new SessionService(sessionDomain))
  container.register(TOKENS.AgentService, new AgentService(sessionDomain, agentDomain))
  container.register(
    TOKENS.PipelineService,
    new PipelineService(sessionDomain, agentDomain, scriptDomain)
  )
  container.register(TOKENS.AnalyzeService, new AnalyzeService(analyzeDomain))
  container.register(TOKENS.ImportService, new ImportService(sessionDomain, importDomain))
  container.register(TOKENS.CheckerService, new CheckerService(checkerDomain))
  container.register(TOKENS.TestStrategistService, new TestStrategistService(testStrategyDomain))
  container.register(
    TOKENS.KnowledgeSearchService,
    new KnowledgeSearchService(knowledgeSearchDomain)
  )
  container.register(TOKENS.TsAnalysisService, new TsAnalysisService(tsAnalysisDomain))
}
