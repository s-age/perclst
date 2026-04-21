export type IGitRepository = {
  getDiffStat(): string | null
  getHead(): string | null
  getDiffSummary(from: string, to: string): string | null
  stageUpdated(path: string): void
  stageNew(path: string): void
  commit(message: string): void
}
