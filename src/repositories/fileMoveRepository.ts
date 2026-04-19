import { resolve, dirname, basename, join } from 'path'
import { moveFile } from '@src/infrastructures/fileMove'
import type { IFileMoveRepository } from '@src/repositories/ports/fileMove'

export class FileMoveRepository implements IFileMoveRepository {
  moveToDone(pipelinePath: string): string {
    const absolutePath = resolve(pipelinePath)
    const dir = dirname(absolutePath)
    const stem = basename(absolutePath, '.json')
    const segments = stem.split('__')
    const filename = segments[segments.length - 1] + '.json'
    const subDirs = segments.slice(0, -1)
    const destDir = join(dir, 'done', ...subDirs)
    const dest = join(destDir, filename)
    moveFile(absolutePath, dest)
    return join('done', ...subDirs, filename)
  }
}
