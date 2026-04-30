import { container } from './container'
import { TOKENS } from './identifiers'
import type { Repos } from './setupRepositories'
import { SessionDomain } from '@src/domains/session'
import { AgentDomain } from '@src/domains/agent'
import { PipelineDomain } from '@src/domains/pipeline'
import { AnalyzeDomain } from '@src/domains/analyze'
import { SessionImportDomain } from '@src/domains/sessionImport'
import { CheckerDomain } from '@src/domains/checker'
import { TestStrategyDomain } from '@src/domains/testStrategy'
import { ScriptDomain } from '@src/domains/script'
import { KnowledgeSearchDomain } from '@src/domains/knowledgeSearch'
import { TsAnalysisDomain } from '@src/domains/tsAnalysis'
import { PipelineFileDomain } from '@src/domains/pipelineFile'
import { PipelineTaskDomain } from '@src/domains/pipelineTask'
import { PipelineLoaderDomain } from '@src/domains/pipelineLoader'
import { PermissionPipeDomain } from '@src/domains/permissionPipe'
import { QuestionPipeDomain } from '@src/domains/questionPipe'
import { GitPendingChangesDomain } from '@src/domains/gitPendingChanges'
import { PlanFileDomain } from '@src/domains/planFile'

export type Domains = {
  sessionDomain: SessionDomain
  agentDomain: AgentDomain
  pipelineDomain: PipelineDomain
  analyzeDomain: AnalyzeDomain
  importDomain: SessionImportDomain
  checkerDomain: CheckerDomain
  testStrategyDomain: TestStrategyDomain
  scriptDomain: ScriptDomain
  knowledgeSearchDomain: KnowledgeSearchDomain
  tsAnalysisDomain: TsAnalysisDomain
  pipelineFileDomain: PipelineFileDomain
  pipelineTaskDomain: PipelineTaskDomain
  pipelineLoaderDomain: PipelineLoaderDomain
  permissionPipeDomain: PermissionPipeDomain
  questionPipeDomain: QuestionPipeDomain
  gitPendingChangesDomain: GitPendingChangesDomain
  planFileDomain: PlanFileDomain
}

export function setupDomains(
  model: string,
  effort: string,
  repos: Repos,
  overrides?: Partial<Domains>
): Domains {
  const sessionDomain = overrides?.sessionDomain ?? new SessionDomain(repos.sessionRepo)
  const agentDomain =
    overrides?.agentDomain ??
    new AgentDomain(model, effort, repos.claudeCodeRepo, repos.procedureRepo)

  const domains: Domains = {
    sessionDomain,
    agentDomain,
    pipelineDomain:
      overrides?.pipelineDomain ??
      new PipelineDomain(agentDomain, sessionDomain, repos.rejectionFeedbackRepo),
    analyzeDomain:
      overrides?.analyzeDomain ?? new AnalyzeDomain(sessionDomain, repos.claudeSessionRepo),
    importDomain: overrides?.importDomain ?? new SessionImportDomain(repos.claudeSessionRepo),
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
    questionPipeDomain:
      overrides?.questionPipeDomain ?? new QuestionPipeDomain(repos.questionPipeRepo),
    gitPendingChangesDomain:
      overrides?.gitPendingChangesDomain ?? new GitPendingChangesDomain(repos.gitRepo),
    planFileDomain: overrides?.planFileDomain ?? new PlanFileDomain(repos.planFileRepo)
  }

  registerAll(domains)
  return domains
}

function registerAll(d: Domains): void {
  container.register(TOKENS.SessionDomain, d.sessionDomain)
  container.register(TOKENS.AgentDomain, d.agentDomain)
  container.register(TOKENS.PipelineDomain, d.pipelineDomain)
  container.register(TOKENS.AnalyzeDomain, d.analyzeDomain)
  container.register(TOKENS.ImportDomain, d.importDomain)
  container.register(TOKENS.CheckerDomain, d.checkerDomain)
  container.register(TOKENS.TestStrategyDomain, d.testStrategyDomain)
  container.register(TOKENS.ScriptDomain, d.scriptDomain)
  container.register(TOKENS.KnowledgeSearchDomain, d.knowledgeSearchDomain)
  container.register(TOKENS.TsAnalysisDomain, d.tsAnalysisDomain)
  container.register(TOKENS.PipelineFileDomain, d.pipelineFileDomain)
  container.register(TOKENS.PipelineTaskDomain, d.pipelineTaskDomain)
  container.register(TOKENS.PipelineLoaderDomain, d.pipelineLoaderDomain)
  container.register(TOKENS.PermissionPipeDomain, d.permissionPipeDomain)
  container.register(TOKENS.QuestionPipeDomain, d.questionPipeDomain)
  container.register(TOKENS.GitPendingChangesDomain, d.gitPendingChangesDomain)
  container.register(TOKENS.PlanFileDomain, d.planFileDomain)
}
