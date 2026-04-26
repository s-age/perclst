import type { FileMoveInfra } from '@src/infrastructures/fileMove'
import type { FsInfra } from '@src/infrastructures/fs'
import type { IPipelineFileRepository } from '@src/repositories/ports/fileMove'
import { extname } from '@src/utils/path'

function isYaml(path: string): boolean {
  const ext = extname(path)
  return ext === '.yaml' || ext === '.yml'
}

type PipelineFileFs = Pick<
  FsInfra,
  'readJson' | 'writeJson' | 'readYaml' | 'writeYaml' | 'cleanDir'
>

export class PipelineFileRepository implements IPipelineFileRepository {
  constructor(
    private fileMoveInfra: FileMoveInfra,
    private fs: PipelineFileFs
  ) {}

  moveToDone(src: string, dest: string): void {
    this.fileMoveInfra.moveFile(src, dest)
  }

  readRaw(path: string): unknown {
    return isYaml(path) ? this.fs.readYaml<unknown>(path) : this.fs.readJson<unknown>(path)
  }

  write(path: string, data: unknown): void {
    if (isYaml(path)) {
      this.fs.writeYaml(path, data)
    } else {
      this.fs.writeJson(path, data)
    }
  }

  cleanDir(dirPath: string): void {
    this.fs.cleanDir(dirPath)
  }
}
