import type { IGitPendingChangesDomain } from '@src/domains/ports/gitPendingChanges'

export class GitPendingChangesService {
  constructor(private readonly domain: IGitPendingChangesDomain) {}

  getPendingDiff(repoPath?: string): string | null {
    return this.domain.getPendingDiff(repoPath)
  }
}
