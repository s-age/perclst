import type { IPipelineFileDomain } from '@src/domains/ports/pipelineFile'
import type { IFileMoveRepository } from '@src/repositories/ports/fileMove'

export class PipelineFileDomain implements IPipelineFileDomain {
  constructor(private readonly fileMoveRepo: IFileMoveRepository) {}

  moveToDone(pipelinePath: string): string {
    return this.fileMoveRepo.moveToDone(pipelinePath)
  }
}
