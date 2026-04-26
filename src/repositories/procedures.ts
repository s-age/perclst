import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { IProcedureRepository } from '@src/repositories/ports/agent'
import type { FsInfra } from '@src/infrastructures/fs'
import { ProcedureNotFoundError } from '@src/errors/procedureNotFoundError'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PACKAGE_PROCEDURES_DIR = join(__dirname, '../../../procedures')

type ProcedureFs = Pick<FsInfra, 'fileExists' | 'readText'>

export class ProcedureRepository implements IProcedureRepository {
  constructor(private fs: ProcedureFs) {}

  load(name: string, workingDir?: string): string {
    if (workingDir) {
      const localPath = join(workingDir, 'procedures', `${name}.md`)
      if (this.fs.fileExists(localPath)) return this.fs.readText(localPath)
    }
    const packagePath = join(PACKAGE_PROCEDURES_DIR, `${name}.md`)
    if (!this.fs.fileExists(packagePath)) throw new ProcedureNotFoundError(name)
    return this.fs.readText(packagePath)
  }

  exists(name: string, workingDir?: string): boolean {
    if (workingDir) {
      const localPath = join(workingDir, 'procedures', `${name}.md`)
      if (this.fs.fileExists(localPath)) return true
    }
    return this.fs.fileExists(join(PACKAGE_PROCEDURES_DIR, `${name}.md`))
  }
}
