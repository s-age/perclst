import type { IPipelineLoaderDomain } from '@src/domains/ports/pipelineLoader'
import type { IPipelineFileRepository } from '@src/repositories/ports/fileMove'

export class PipelineLoaderDomain implements IPipelineLoaderDomain {
  constructor(private readonly repo: IPipelineFileRepository) {}

  loadRaw(absolutePath: string): unknown {
    return this.repo.readRawJson(absolutePath)
  }
}
