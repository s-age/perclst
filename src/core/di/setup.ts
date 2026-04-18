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
import { PipelineDomain } from '@src/domains/pipeline'
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

type Repos = {
  claudeCodeRepo: ClaudeCodeRepository
  shellRepo: ShellRepository
  sessionRepo: SessionRepository
  claudeSessionRepo: ClaudeSessionRepository
  procedureRepo: ProcedureRepository
  checkerRepo: CheckerRepository
  testStrategyRepo: TestStrategyRepository
  knowledgeSearchRepo: KnowledgeSearchRepository
  tsAnalysisRepo: TsAnalysisRepository
}

type Domains = {
  scriptDomain: ScriptDomain
  sessionDomain: SessionDomain
  agentDomain: AgentDomain
  pipelineDomain: PipelineDomain
  analyzeDomain: AnalyzeDomain
  importDomain: ImportDomain
  checkerDomain: CheckerDomain
  testStrategyDomain: TestStrategyDomain
  knowledgeSearchDomain: KnowledgeSearchDomain
  tsAnalysisDomain: TsAnalysisDomain
}

function buildRepos(sessionsDir: string): Repos {
  return {
    claudeCodeRepo: new ClaudeCodeRepository(),
    shellRepo: new ShellRepository(),
    sessionRepo: new SessionRepository(sessionsDir),
    claudeSessionRepo: new ClaudeSessionRepository(),
    procedureRepo: new ProcedureRepository(),
    checkerRepo: new CheckerRepository(),
    testStrategyRepo: new TestStrategyRepository(),
    knowledgeSearchRepo: new KnowledgeSearchRepository(),
    tsAnalysisRepo: new TsAnalysisRepository()
  }
}

function buildDomains(model: string, repos: Repos): Domains {
  const {
    claudeCodeRepo,
    shellRepo,
    sessionRepo,
    claudeSessionRepo,
    procedureRepo,
    checkerRepo,
    testStrategyRepo,
    knowledgeSearchRepo,
    tsAnalysisRepo
  } = repos
  const sessionDomain = new SessionDomain(sessionRepo)
  const agentDomain = new AgentDomain(model, claudeCodeRepo, procedureRepo)
  return {
    scriptDomain: new ScriptDomain(shellRepo),
    sessionDomain,
    agentDomain,
    pipelineDomain: new PipelineDomain(agentDomain),
    analyzeDomain: new AnalyzeDomain(sessionDomain, claudeSessionRepo),
    importDomain: new ImportDomain(claudeSessionRepo),
    checkerDomain: new CheckerDomain(checkerRepo),
    testStrategyDomain: new TestStrategyDomain(testStrategyRepo),
    knowledgeSearchDomain: new KnowledgeSearchDomain(knowledgeSearchRepo),
    tsAnalysisDomain: new TsAnalysisDomain(tsAnalysisRepo)
  }
}

function registerReposAndDomains(
  config: ReturnType<typeof loadConfig>,
  repos: Repos,
  domains: Domains
): void {
  container.register(TOKENS.Config, config)
  container.register(TOKENS.ShellRepository, repos.shellRepo)
  container.register(TOKENS.ClaudeCodeRepository, repos.claudeCodeRepo)
  container.register(TOKENS.SessionRepository, repos.sessionRepo)
  container.register(TOKENS.ClaudeSessionRepository, repos.claudeSessionRepo)
  container.register(TOKENS.ProcedureRepository, repos.procedureRepo)
  container.register(TOKENS.CheckerRepository, repos.checkerRepo)
  container.register(TOKENS.TestStrategyRepository, repos.testStrategyRepo)
  container.register(TOKENS.KnowledgeSearchRepository, repos.knowledgeSearchRepo)
  container.register(TOKENS.TsAnalysisRepository, repos.tsAnalysisRepo)
  container.register(TOKENS.ScriptDomain, domains.scriptDomain)
  container.register(TOKENS.SessionDomain, domains.sessionDomain)
  container.register(TOKENS.AgentDomain, domains.agentDomain)
  container.register(TOKENS.PipelineDomain, domains.pipelineDomain)
  container.register(TOKENS.AnalyzeDomain, domains.analyzeDomain)
  container.register(TOKENS.ImportDomain, domains.importDomain)
  container.register(TOKENS.CheckerDomain, domains.checkerDomain)
  container.register(TOKENS.TestStrategyDomain, domains.testStrategyDomain)
  container.register(TOKENS.KnowledgeSearchDomain, domains.knowledgeSearchDomain)
  container.register(TOKENS.TsAnalysisDomain, domains.tsAnalysisDomain)
}

function registerServices(domains: Domains): void {
  const {
    sessionDomain,
    agentDomain,
    pipelineDomain,
    scriptDomain,
    analyzeDomain,
    importDomain,
    checkerDomain,
    testStrategyDomain,
    knowledgeSearchDomain,
    tsAnalysisDomain
  } = domains
  container.register(TOKENS.SessionService, new SessionService(sessionDomain))
  container.register(TOKENS.AgentService, new AgentService(sessionDomain, agentDomain))
  container.register(
    TOKENS.PipelineService,
    new PipelineService(sessionDomain, pipelineDomain, scriptDomain)
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

export function setupContainer(): void {
  const config = loadConfig()
  const sessionsDir = resolveSessionsDir(config)
  const model = config.model ?? DEFAULT_MODEL
  const repos = buildRepos(sessionsDir)
  const domains = buildDomains(model, repos)
  registerReposAndDomains(config, repos, domains)
  registerServices(domains)
}
