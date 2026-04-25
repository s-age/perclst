import type { IPipelineLoaderDomain } from '@src/domains/ports/pipelineLoader'
import type { IPipelineFileRepository } from '@src/repositories/ports/fileMove'
import type { Pipeline } from '@src/types/pipeline'

export class PipelineLoaderDomain implements IPipelineLoaderDomain {
  constructor(private readonly repo: IPipelineFileRepository) {}

  load(absolutePath: string): Pipeline {
    return this.repo.readRawJson(absolutePath) as Pipeline
  }
}
