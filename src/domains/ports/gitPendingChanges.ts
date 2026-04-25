export type IGitPendingChangesDomain = {
  getPendingDiff(repoPath?: string): string | null
}
