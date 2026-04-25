export type IGitRepository = {
  getDiffStat(): string | null
  getHead(): string | null
  getDiffSummary(from: string, to: string): string | null
  getDiff(from: string, to: string): string | null
  getPendingDiff(repoPath?: string): string | null
  stageUpdated(path: string): void
  stageNew(path: string): void
  commit(message: string): void
}
