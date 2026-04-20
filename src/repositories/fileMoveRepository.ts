import { moveFile } from '@src/infrastructures/fileMove'
import { readJson } from '@src/infrastructures/fs'
import type { IFileMoveRepository } from '@src/repositories/ports/fileMove'

export class FileMoveRepository implements IFileMoveRepository {
  moveToDone(src: string, dest: string): void {
    moveFile(src, dest)
  }

  readRawJson(path: string): unknown {
    return readJson<unknown>(path)
  }
}
