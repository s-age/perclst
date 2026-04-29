import { container } from './container'
import { TOKENS } from './identifiers'
import type { Infras } from './setupInfrastructures'
import { SessionRepository } from '@src/repositories/sessions'
import { ClaudeSessionRepository } from '@src/repositories/claudeSessions'
import type { IClaudeSessionRepository } from '@src/repositories/ports/analysis'
import { ProcedureRepository } from '@src/repositories/procedures'
import { CheckerRepository } from '@src/repositories/checkerRepository'
import { TestStrategyRepository } from '@src/repositories/testStrategyRepository'
import { ClaudeCodeRepository } from '@src/repositories/agentRepository'
import { ShellRepository } from '@src/repositories/shell'
import { KnowledgeSearchRepository } from '@src/repositories/knowledgeSearchRepository'
import { TsAnalysisRepository } from '@src/repositories/tsAnalysisRepository'
import { PipelineFileRepository } from '@src/repositories/fileMoveRepository'
import { GitRepository } from '@src/repositories/gitRepository'
import { RejectionFeedbackRepository } from '@src/repositories/rejectionFeedback'
import { PermissionPipeRepository } from '@src/repositories/permissionPipeRepository'
import { PlanFileRepository } from '@src/repositories/planFileRepository'

export type Repos = {
  claudeCodeRepo: ClaudeCodeRepository
  shellRepo: ShellRepository
  sessionRepo: SessionRepository
  claudeSessionRepo: IClaudeSessionRepository
  procedureRepo: ProcedureRepository
  checkerRepo: CheckerRepository
  testStrategyRepo: TestStrategyRepository
  knowledgeSearchRepo: KnowledgeSearchRepository
  tsAnalysisRepo: TsAnalysisRepository
  fileMoveRepo: PipelineFileRepository
  gitRepo: GitRepository
  rejectionFeedbackRepo: RejectionFeedbackRepository
  permissionPipeRepo: PermissionPipeRepository
  planFileRepo: PlanFileRepository
}

export function setupRepositories(
  infras: Infras,
  opts: { sessionsDir: string; knowledgeDir: string },
  overrides?: Partial<Repos>
): Repos {
  const repos: Repos = {
    claudeCodeRepo: overrides?.claudeCodeRepo ?? new ClaudeCodeRepository(infras.claudeCodeInfra),
    shellRepo: overrides?.shellRepo ?? new ShellRepository(infras.shellInfra),
    sessionRepo: overrides?.sessionRepo ?? new SessionRepository(infras.fsInfra, opts.sessionsDir),
    claudeSessionRepo: overrides?.claudeSessionRepo ?? new ClaudeSessionRepository(infras.fsInfra),
    procedureRepo: overrides?.procedureRepo ?? new ProcedureRepository(infras.fsInfra),
    checkerRepo:
      overrides?.checkerRepo ??
      new CheckerRepository(infras.commandRunnerInfra, infras.projectRootInfra),
    testStrategyRepo:
      overrides?.testStrategyRepo ??
      new TestStrategyRepository(
        infras.tsAnalyzerSkipAddFiles,
        infras.fsInfra,
        infras.testFileDiscoveryInfra
      ),
    knowledgeSearchRepo:
      overrides?.knowledgeSearchRepo ??
      new KnowledgeSearchRepository(infras.knowledgeReaderInfra, opts.knowledgeDir),
    tsAnalysisRepo: overrides?.tsAnalysisRepo ?? new TsAnalysisRepository(infras.tsAnalyzer),
    fileMoveRepo:
      overrides?.fileMoveRepo ?? new PipelineFileRepository(infras.fileMoveInfra, infras.fsInfra),
    gitRepo: overrides?.gitRepo ?? new GitRepository(infras.gitInfra, infras.projectRootInfra),
    rejectionFeedbackRepo:
      overrides?.rejectionFeedbackRepo ?? new RejectionFeedbackRepository(infras.fsInfra),
    permissionPipeRepo:
      overrides?.permissionPipeRepo ??
      new PermissionPipeRepository(infras.fsInfra, infras.ttyInfra),
    planFileRepo: overrides?.planFileRepo ?? new PlanFileRepository(infras.fsInfra)
  }

  registerAll(repos)
  return repos
}

function registerAll(repos: Repos): void {
  container.register(TOKENS.ClaudeCodeRepository, repos.claudeCodeRepo)
  container.register(TOKENS.ShellRepository, repos.shellRepo)
  container.register(TOKENS.SessionRepository, repos.sessionRepo)
  container.register(TOKENS.ClaudeSessionRepository, repos.claudeSessionRepo)
  container.register(TOKENS.ProcedureRepository, repos.procedureRepo)
  container.register(TOKENS.CheckerRepository, repos.checkerRepo)
  container.register(TOKENS.TestStrategyRepository, repos.testStrategyRepo)
  container.register(TOKENS.KnowledgeSearchRepository, repos.knowledgeSearchRepo)
  container.register(TOKENS.TsAnalysisRepository, repos.tsAnalysisRepo)
  container.register(TOKENS.PipelineFileRepository, repos.fileMoveRepo)
  container.register(TOKENS.GitRepository, repos.gitRepo)
  container.register(TOKENS.RejectionFeedbackRepository, repos.rejectionFeedbackRepo)
  container.register(TOKENS.PermissionPipeRepository, repos.permissionPipeRepo)
  container.register(TOKENS.PlanFileRepository, repos.planFileRepo)
}
