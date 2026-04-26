import { moveFile } from '@src/infrastructures/fileMove'
import {
  readJson,
  writeJson as writeJsonFs,
  readYaml,
  writeYaml as writeYamlFs,
  cleanDir as cleanDirFs
} from '@src/infrastructures/fs'
import type { IPipelineFileRepository } from '@src/repositories/ports/fileMove'
import { extname } from '@src/utils/path'

function isYaml(path: string): boolean {
  const ext = extname(path)
  return ext === '.yaml' || ext === '.yml'
}

export class PipelineFileRepository implements IPipelineFileRepository {
  moveToDone(src: string, dest: string): void {
    moveFile(src, dest)
  }

  readRaw(path: string): unknown {
    return isYaml(path) ? readYaml<unknown>(path) : readJson<unknown>(path)
  }

  write(path: string, data: unknown): void {
    if (isYaml(path)) {
      writeYamlFs(path, data)
    } else {
      writeJsonFs(path, data)
    }
  }

  cleanDir(dirPath: string): void {
    cleanDirFs(dirPath)
  }
}
