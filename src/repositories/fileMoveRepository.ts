import { moveFile } from '@src/infrastructures/fileMove'
import type { IFileMoveRepository } from '@src/repositories/ports/fileMove'

export class FileMoveRepository implements IFileMoveRepository {
  moveToDone(src: string, dest: string): void {
    moveFile(src, dest)
  }
}
