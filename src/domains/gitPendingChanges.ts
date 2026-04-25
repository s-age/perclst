import type { IGitPendingChangesDomain } from './ports/gitPendingChanges'
import type { IGitRepository } from '@src/repositories/ports/git'

export class GitPendingChangesDomain implements IGitPendingChangesDomain {
  constructor(private readonly gitRepo: IGitRepository) {}

  getPendingDiff(repoPath?: string, extensions?: string[]): string | null {
    return this.gitRepo.getPendingDiff(repoPath, extensions)
  }
}
