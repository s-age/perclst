import { moveFile } from '@src/infrastructures/fileMove'
import { readJson, cleanDir as cleanDirFs } from '@src/infrastructures/fs'
import type { IPipelineFileRepository } from '@src/repositories/ports/fileMove'

export class PipelineFileRepository implements IPipelineFileRepository {
  moveToDone(src: string, dest: string): void {
    moveFile(src, dest)
  }

  readRawJson(path: string): unknown {
    return readJson<unknown>(path)
  }

  cleanDir(dirPath: string): void {
    cleanDirFs(dirPath)
  }
}
