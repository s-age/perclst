import { container } from './container'
import { TOKENS } from './identifiers'
import type { Domains } from './setupDomains'
import type { Repos } from './setupRepositories'
import { AbortService } from '@src/services/abortService'
import { SessionService } from '@src/services/sessionService'
import { AgentService } from '@src/services/agentService'
import { AnalyzeService } from '@src/services/analyzeService'
import { ImportService } from '@src/services/importService'
import { CheckerService } from '@src/services/checkerService'
import { TestStrategistService } from '@src/services/testStrategistService'
import { PipelineService } from '@src/services/pipelineService'
import { KnowledgeSearchService } from '@src/services/knowledgeSearchService'
import { TsAnalysisService } from '@src/services/tsAnalysisService'
import { PipelineFileService } from '@src/services/pipelineFileService'
import { PermissionPipeService } from '@src/services/permissionPipeService'
import { GitPendingChangesService } from '@src/services/gitPendingChangesService'
import { PlanFileService } from '@src/services/planFileService'
import type { Config } from '@src/types/config'

export type Services = {
  abortService: AbortService
  sessionService: SessionService
  agentService: AgentService
  analyzeService: AnalyzeService
  importService: ImportService
  checkerService: CheckerService
  testStrategistService: TestStrategistService
  pipelineService: PipelineService
  knowledgeSearchService: KnowledgeSearchService
  tsAnalysisService: TsAnalysisService
  pipelineFileService: PipelineFileService
  permissionPipeService: PermissionPipeService
  gitPendingChangesService: GitPendingChangesService
  planFileService: PlanFileService
}

export function setupServices(
  config: Config,
  domains: Domains,
  repos: Repos,
  overrides?: Partial<Services>
): Services {
  const services: Services = {
    abortService: overrides?.abortService ?? new AbortService(),
    sessionService: overrides?.sessionService ?? new SessionService(domains.sessionDomain),
    agentService:
      overrides?.agentService ??
      new AgentService(domains.sessionDomain, domains.agentDomain, config),
    analyzeService: overrides?.analyzeService ?? new AnalyzeService(domains.analyzeDomain),
    importService:
      overrides?.importService ?? new ImportService(domains.sessionDomain, domains.importDomain),
    checkerService: overrides?.checkerService ?? new CheckerService(domains.checkerDomain),
    testStrategistService:
      overrides?.testStrategistService ?? new TestStrategistService(domains.testStrategyDomain),
    pipelineService:
      overrides?.pipelineService ??
      new PipelineService(
        domains.pipelineDomain,
        domains.scriptDomain,
        domains.pipelineTaskDomain,
        domains.pipelineLoaderDomain
      ),
    knowledgeSearchService:
      overrides?.knowledgeSearchService ??
      new KnowledgeSearchService(domains.knowledgeSearchDomain),
    tsAnalysisService:
      overrides?.tsAnalysisService ?? new TsAnalysisService(domains.tsAnalysisDomain),
    pipelineFileService:
      overrides?.pipelineFileService ?? new PipelineFileService(domains.pipelineFileDomain),
    permissionPipeService:
      overrides?.permissionPipeService ?? new PermissionPipeService(domains.permissionPipeDomain),
    gitPendingChangesService:
      overrides?.gitPendingChangesService ??
      new GitPendingChangesService(domains.gitPendingChangesDomain),
    planFileService: overrides?.planFileService ?? new PlanFileService(domains.planFileDomain)
  }

  registerAll(services)
  return services
}

function registerAll(s: Services): void {
  container.register(TOKENS.AbortService, s.abortService)
  container.register(TOKENS.SessionService, s.sessionService)
  container.register(TOKENS.AgentService, s.agentService)
  container.register(TOKENS.AnalyzeService, s.analyzeService)
  container.register(TOKENS.ImportService, s.importService)
  container.register(TOKENS.CheckerService, s.checkerService)
  container.register(TOKENS.TestStrategistService, s.testStrategistService)
  container.register(TOKENS.PipelineService, s.pipelineService)
  container.register(TOKENS.KnowledgeSearchService, s.knowledgeSearchService)
  container.register(TOKENS.TsAnalysisService, s.tsAnalysisService)
  container.register(TOKENS.PipelineFileService, s.pipelineFileService)
  container.register(TOKENS.PermissionPipeService, s.permissionPipeService)
  container.register(TOKENS.GitPendingChangesService, s.gitPendingChangesService)
  container.register(TOKENS.PlanFileService, s.planFileService)
}
