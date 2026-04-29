import type { FileMoveInfra } from '@src/infrastructures/fileMove'
import type { FsInfra } from '@src/infrastructures/fs'
import type { IPipelineFileRepository } from '@src/repositories/ports/fileMove'
import { extname } from '@src/utils/path'
import { parseYaml, stringifyYaml } from '@src/utils/yaml'

function isYaml(path: string): boolean {
  const ext = extname(path)
  return ext === '.yaml' || ext === '.yml'
}

type PipelineFileFs = Pick<
  FsInfra,
  'readText' | 'writeText' | 'fileExists' | 'listDirEntries' | 'removeFileSync'
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
    const text = this.fs.readText(path)
    return isYaml(path) ? (parseYaml(text) as unknown) : (JSON.parse(text) as unknown)
  }

  write(path: string, data: unknown): void {
    if (isYaml(path)) {
      this.fs.writeText(path, stringifyYaml(data))
    } else {
      this.fs.writeText(path, JSON.stringify(data, null, 2))
    }
  }

  cleanDir(dirPath: string): void {
    if (!this.fs.fileExists(dirPath)) return
    for (const entry of this.fs.listDirEntries(dirPath)) {
      if (entry.isFile()) {
        try {
          this.fs.removeFileSync(`${dirPath}/${entry.name}`)
        } catch {
          // ignore locked or already removed files
        }
      }
    }
  }
}
