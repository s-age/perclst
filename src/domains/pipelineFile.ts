import type { IPipelineFileDomain } from '@src/domains/ports/pipelineFile'
import type { IFileMoveRepository } from '@src/repositories/ports/fileMove'
import { resolve, dirname, basename, join } from '@src/utils/path'

export class PipelineFileDomain implements IPipelineFileDomain {
  constructor(private readonly fileMoveRepo: IFileMoveRepository) {}

  moveToDone(pipelinePath: string): string {
    const absoluteSrc = resolve(pipelinePath)
    const dir = dirname(absoluteSrc)
    const stem = basename(absoluteSrc, '.json')
    const segments = stem.split('__')
    const filename = segments[segments.length - 1] + '.json'
    const subDirs = segments.slice(0, -1)
    const dest = join(dir, 'done', ...subDirs, filename)
    const relativeDest = join('done', ...subDirs, filename)
    this.fileMoveRepo.moveToDone(absoluteSrc, dest)
    return relativeDest
  }
}
