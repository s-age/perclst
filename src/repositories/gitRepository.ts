import type { IGitRepository } from '@src/repositories/ports/git'
import { execGitSync } from '@src/infrastructures/git'

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
