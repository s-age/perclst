import { container } from './container'
import { TOKENS } from './identifiers'
import { ClaudeCodeInfra } from '@src/infrastructures/claudeCode'
import { FsInfra } from '@src/infrastructures/fs'
import { GitInfra } from '@src/infrastructures/git'
import { ShellInfra } from '@src/infrastructures/shell'
import { CommandRunnerInfra } from '@src/infrastructures/commandRunner'
import { FileMoveInfra } from '@src/infrastructures/fileMove'
import { KnowledgeReaderInfra } from '@src/infrastructures/knowledgeReader'
import { ProjectRootInfra } from '@src/infrastructures/projectRoot'
import { TestFileDiscoveryInfra } from '@src/infrastructures/testFileDiscovery'
import { TtyInfra } from '@src/infrastructures/ttyInfrastructure'
import { TsAnalyzer } from '@src/infrastructures/tsAnalyzer'

export type Infras = {
  claudeCodeInfra: ClaudeCodeInfra
  fsInfra: FsInfra
  gitInfra: GitInfra
  shellInfra: ShellInfra
  commandRunnerInfra: CommandRunnerInfra
  fileMoveInfra: FileMoveInfra
  knowledgeReaderInfra: KnowledgeReaderInfra
  projectRootInfra: ProjectRootInfra
  testFileDiscoveryInfra: TestFileDiscoveryInfra
  ttyInfra: TtyInfra
  tsAnalyzer: TsAnalyzer
  tsAnalyzerSkipAddFiles: TsAnalyzer
}

export function setupInfrastructures(overrides?: Partial<Infras>): Infras {
  const infras: Infras = {
    claudeCodeInfra: overrides?.claudeCodeInfra ?? new ClaudeCodeInfra(),
    fsInfra: overrides?.fsInfra ?? new FsInfra(),
    gitInfra: overrides?.gitInfra ?? new GitInfra(),
    shellInfra: overrides?.shellInfra ?? new ShellInfra(),
    commandRunnerInfra: overrides?.commandRunnerInfra ?? new CommandRunnerInfra(),
    fileMoveInfra: overrides?.fileMoveInfra ?? new FileMoveInfra(),
    knowledgeReaderInfra: overrides?.knowledgeReaderInfra ?? new KnowledgeReaderInfra(),
    projectRootInfra: overrides?.projectRootInfra ?? new ProjectRootInfra(),
    testFileDiscoveryInfra: overrides?.testFileDiscoveryInfra ?? new TestFileDiscoveryInfra(),
    ttyInfra: overrides?.ttyInfra ?? new TtyInfra(),
    tsAnalyzer: overrides?.tsAnalyzer ?? new TsAnalyzer(),
    tsAnalyzerSkipAddFiles:
      overrides?.tsAnalyzerSkipAddFiles ?? new TsAnalyzer({ skipAddingFilesFromTsConfig: true })
  }

  container.register(TOKENS.ClaudeCodeInfra, infras.claudeCodeInfra)
  container.register(TOKENS.FsInfra, infras.fsInfra)
  container.register(TOKENS.GitInfra, infras.gitInfra)
  container.register(TOKENS.ShellInfra, infras.shellInfra)
  container.register(TOKENS.CommandRunnerInfra, infras.commandRunnerInfra)
  container.register(TOKENS.FileMoveInfra, infras.fileMoveInfra)
  container.register(TOKENS.KnowledgeReaderInfra, infras.knowledgeReaderInfra)
  container.register(TOKENS.ProjectRootInfra, infras.projectRootInfra)
  container.register(TOKENS.TestFileDiscoveryInfra, infras.testFileDiscoveryInfra)
  container.register(TOKENS.TtyInfra, infras.ttyInfra)
  container.register(TOKENS.TsAnalyzer, infras.tsAnalyzer)
  container.register(TOKENS.TsAnalyzerSkipAddFiles, infras.tsAnalyzerSkipAddFiles)

  return infras
}
