import type { IGitRepository } from '@src/repositories/ports/git'
import type { GitInfra } from '@src/infrastructures/git'
import type { ProjectRootInfra } from '@src/infrastructures/projectRoot'

export class GitRepository implements IGitRepository {
  constructor(
    private git: GitInfra,
    private projectRoot: ProjectRootInfra
  ) {}

  getDiffStat(): string | null {
    try {
      const staged = this.git.execGitSync(['diff', '--cached', '--stat'])
      const unstaged = this.git.execGitSync(['diff', '--stat'])
      const combined = [staged, unstaged].filter(Boolean).join('\n')
      return combined || null
    } catch {
      return null
    }
  }

  getHead(): string | null {
    try {
      return this.git.execGitSync(['rev-parse', 'HEAD'])
    } catch {
      return null
    }
  }

  getDiffSummary(from: string, to: string): string | null {
    try {
      const stat = this.git.execGitSync(['diff', `${from}...${to}`, '--stat'])
      return stat || null
    } catch {
      return null
    }
  }

  getDiff(from: string, to: string): string | null {
    try {
      const diff = this.git.execGitSync(['diff', from, to])
      return diff || null
    } catch {
      return null
    }
  }

  getPendingDiff(repoPath?: string, extensions?: string[]): string | null {
    try {
      const cwd = repoPath ?? this.projectRoot.findProjectRoot()
      const pathspecs = extensions?.length ? ['--', ...extensions.map((ext) => `*.${ext}`)] : []
      const staged = this.git.spawnGitSync(['diff', '--cached', ...pathspecs], cwd)
      const unstaged = this.git.spawnGitSync(['diff', ...pathspecs], cwd)
      const untrackedOutput = this.git.spawnGitSync(
        ['ls-files', '--others', '--exclude-standard', ...pathspecs],
        cwd
      )
      const untrackedFiles = untrackedOutput.split('\n').filter(Boolean)
      const untrackedDiffs = untrackedFiles
        .map((file) => this.git.spawnGitSync(['diff', '--no-index', '/dev/null', file], cwd))
        .filter(Boolean)
      const combined = [staged, unstaged, ...untrackedDiffs].filter(Boolean).join('\n')
      return combined || null
    } catch {
      return null
    }
  }

  hasTrackedFiles(path: string): boolean {
    return this.git.spawnGitSync(['ls-files', path]).length > 0
  }

  stageUpdated(path: string): void {
    this.git.execGitSync(['add', '-u', path])
  }

  stageNew(path: string): void {
    this.git.execGitSync(['add', path])
  }

  commit(message: string): void {
    this.git.execGitSync(['commit', '-m', message])
  }
}
