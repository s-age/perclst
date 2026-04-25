export type IGitPendingChangesDomain = {
  getPendingDiff(repoPath?: string, extensions?: string[]): string | null
}
