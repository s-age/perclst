import { container } from './container'
import { TOKENS } from './identifiers'
import type { Repos } from './setupRepositories'
import { SessionDomain } from '@src/domains/session'
import { AgentDomain } from '@src/domains/agent'
import { PipelineDomain } from '@src/domains/pipeline'
import { AnalyzeDomain } from '@src/domains/analyze'
import { ImportDomain } from '@src/domains/import'
import { CheckerDomain } from '@src/domains/checker'
import { TestStrategyDomain } from '@src/domains/testStrategy'
import { ScriptDomain } from '@src/domains/script'
import { KnowledgeSearchDomain } from '@src/domains/knowledgeSearch'
import { TsAnalysisDomain } from '@src/domains/tsAnalysis'
import { PipelineFileDomain } from '@src/domains/pipelineFile'
import { PipelineTaskDomain } from '@src/domains/pipelineTask'
import { PipelineLoaderDomain } from '@src/domains/pipelineLoader'
import { PermissionPipeDomain } from '@src/domains/permissionPipe'
import { GitPendingChangesDomain } from '@src/domains/gitPendingChanges'
import { PlanFileDomain } from '@src/domains/planFile'

export type Domains = {
  sessionDomain: SessionDomain
  agentDomain: AgentDomain
  pipelineDomain: PipelineDomain
  analyzeDomain: AnalyzeDomain
  importDomain: ImportDomain
  checkerDomain: CheckerDomain
  testStrategyDomain: TestStrategyDomain
  scriptDomain: ScriptDomain
  knowledgeSearchDomain: KnowledgeSearchDomain
  tsAnalysisDomain: TsAnalysisDomain
  pipelineFileDomain: PipelineFileDomain
  pipelineTaskDomain: PipelineTaskDomain
  pipelineLoaderDomain: PipelineLoaderDomain
  permissionPipeDomain: PermissionPipeDomain
  gitPendingChangesDomain: GitPendingChangesDomain
  planFileDomain: PlanFileDomain
}

export function setupDomains(model: string, repos: Repos, overrides?: Partial<Domains>): Domains {
  const sessionDomain = overrides?.sessionDomain ?? new SessionDomain(repos.sessionRepo)
  const agentDomain =
    overrides?.agentDomain ?? new AgentDomain(model, repos.claudeCodeRepo, repos.procedureRepo)

  const domains: Domains = {
    sessionDomain,
    agentDomain,
    pipelineDomain:
      overrides?.pipelineDomain ??
      new PipelineDomain(agentDomain, sessionDomain, repos.rejectionFeedbackRepo),
    analyzeDomain:
      overrides?.analyzeDomain ?? new AnalyzeDomain(sessionDomain, repos.claudeSessionRepo),
    importDomain: overrides?.importDomain ?? new ImportDomain(repos.claudeSessionRepo),
    checkerDomain: overrides?.checkerDomain ?? new CheckerDomain(repos.checkerRepo),
    testStrategyDomain:
      overrides?.testStrategyDomain ?? new TestStrategyDomain(repos.testStrategyRepo),
    scriptDomain: overrides?.scriptDomain ?? new ScriptDomain(repos.shellRepo),
    knowledgeSearchDomain:
      overrides?.knowledgeSearchDomain ?? new KnowledgeSearchDomain(repos.knowledgeSearchRepo),
    tsAnalysisDomain: overrides?.tsAnalysisDomain ?? new TsAnalysisDomain(repos.tsAnalysisRepo),
    pipelineFileDomain:
      overrides?.pipelineFileDomain ?? new PipelineFileDomain(repos.fileMoveRepo, repos.gitRepo),
    pipelineTaskDomain: overrides?.pipelineTaskDomain ?? new PipelineTaskDomain(),
    pipelineLoaderDomain:
      overrides?.pipelineLoaderDomain ?? new PipelineLoaderDomain(repos.fileMoveRepo),
    permissionPipeDomain:
      overrides?.permissionPipeDomain ?? new PermissionPipeDomain(repos.permissionPipeRepo),
    gitPendingChangesDomain:
      overrides?.gitPendingChangesDomain ?? new GitPendingChangesDomain(repos.gitRepo),
    planFileDomain: overrides?.planFileDomain ?? new PlanFileDomain(repos.planFileRepo)
  }

  container.register(TOKENS.SessionDomain, domains.sessionDomain)
  container.register(TOKENS.AgentDomain, domains.agentDomain)
  container.register(TOKENS.PipelineDomain, domains.pipelineDomain)
  container.register(TOKENS.AnalyzeDomain, domains.analyzeDomain)
  container.register(TOKENS.ImportDomain, domains.importDomain)
  container.register(TOKENS.CheckerDomain, domains.checkerDomain)
  container.register(TOKENS.TestStrategyDomain, domains.testStrategyDomain)
  container.register(TOKENS.ScriptDomain, domains.scriptDomain)
  container.register(TOKENS.KnowledgeSearchDomain, domains.knowledgeSearchDomain)
  container.register(TOKENS.TsAnalysisDomain, domains.tsAnalysisDomain)
  container.register(TOKENS.PipelineFileDomain, domains.pipelineFileDomain)
  container.register(TOKENS.PipelineTaskDomain, domains.pipelineTaskDomain)
  container.register(TOKENS.PipelineLoaderDomain, domains.pipelineLoaderDomain)
  container.register(TOKENS.PermissionPipeDomain, domains.permissionPipeDomain)
  container.register(TOKENS.GitPendingChangesDomain, domains.gitPendingChangesDomain)
  container.register(TOKENS.PlanFileDomain, domains.planFileDomain)

  return domains
}
