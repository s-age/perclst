import type { Pipeline } from '@src/types/pipeline'

export type IPipelineFileDomain = {
  moveToDone(pipelinePath: string): string | null
  getDiffStat(): string | null
  getHead(): string | null
  getDiffSummary(from: string, to: string): string | null
  commitMove(originalPath: string, donePath: string): void
  cleanTmpDir(): void
  loadRawPipeline(absolutePath: string): unknown
  savePipeline(absolutePath: string, pipeline: Pipeline): void
}
