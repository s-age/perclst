import type { IPipelineFileDomain } from '@src/domains/ports/pipelineFile'

export class PipelineFileService {
  constructor(private readonly pipelineFileDomain: IPipelineFileDomain) {}

  moveToDone(pipelinePath: string): string {
    return this.pipelineFileDomain.moveToDone(pipelinePath)
  }
}
