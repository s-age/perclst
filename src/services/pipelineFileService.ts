import type { IPipelineFileDomain } from '@src/domains/ports/pipelineFile'
import type { Pipeline } from '@src/types/pipeline'

export class PipelineFileService {
  constructor(private readonly pipelineFileDomain: IPipelineFileDomain) {}

  moveToDone(pipelinePath: string): string {
    return this.pipelineFileDomain.moveToDone(pipelinePath)
  }

  getDiffStat(): string | null {
    return this.pipelineFileDomain.getDiffStat()
  }

  getHead(): string | null {
    return this.pipelineFileDomain.getHead()
  }

  getDiffSummary(from: string, to: string): string | null {
    return this.pipelineFileDomain.getDiffSummary(from, to)
  }

  commitMove(originalPath: string, donePath: string): void {
    this.pipelineFileDomain.commitMove(originalPath, donePath)
  }

  cleanTmpDir(): void {
    this.pipelineFileDomain.cleanTmpDir()
  }

  loadRawPipeline(absolutePath: string): unknown {
    return this.pipelineFileDomain.loadRawPipeline(absolutePath)
  }

  savePipeline(absolutePath: string, pipeline: Pipeline): void {
    this.pipelineFileDomain.savePipeline(absolutePath, pipeline)
  }
}
