import type { IGitRepository } from '@src/repositories/ports/git'
import { execGitSync, spawnGitSync } from '@src/infrastructures/git'
import { findProjectRoot } from '@src/infrastructures/projectRoot'

export class GitRepository implements IGitRepository {
  getDiffStat(): string | null {
    try {
      const staged = execGitSync('diff --cached --stat')
      const unstaged = execGitSync('diff --stat')
      const combined = [staged, unstaged].filter(Boolean).join('\n')
      return combined || null
    } catch {
      return null
    }
  }

  getHead(): string | null {
    try {
      return execGitSync('rev-parse HEAD')
    } catch {
      return null
    }
  }

  getDiffSummary(from: string, to: string): string | null {
    try {
      const stat = execGitSync(`diff ${from}...${to} --stat`)
      return stat || null
    } catch {
      return null
    }
  }

  getDiff(from: string, to: string): string | null {
    try {
      const diff = execGitSync(`diff ${from} ${to}`)
      return diff || null
    } catch {
      return null
    }
  }

  getPendingDiff(repoPath?: string): string | null {
    try {
      const cwd = repoPath ?? findProjectRoot()
      const staged = execGitSync('diff --cached', cwd)
      const unstaged = execGitSync('diff', cwd)
      const untrackedOutput = execGitSync('ls-files --others --exclude-standard', cwd)
      const untrackedFiles = untrackedOutput.split('\n').filter(Boolean)
      const untrackedDiffs = untrackedFiles
        .map((file) => spawnGitSync(['diff', '--no-index', '/dev/null', file], cwd))
        .filter(Boolean)
      const combined = [staged, unstaged, ...untrackedDiffs].filter(Boolean).join('\n')
      return combined || null
    } catch {
      return null
    }
  }

  stageUpdated(path: string): void {
    execGitSync(`add -u "${path}"`)
  }

  stageNew(path: string): void {
    execGitSync(`add "${path}"`)
  }

  commit(message: string): void {
    execGitSync(`commit -m "${message}"`)
  }
}
