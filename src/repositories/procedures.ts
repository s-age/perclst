import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { IProcedureRepository } from '@src/repositories/ports/agent'
import { ProcedureNotFoundError } from '@src/errors/procedureNotFoundError'
import { fileExists, readText } from '@src/infrastructures/fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PACKAGE_PROCEDURES_DIR = join(__dirname, '../../../procedures')

export class ProcedureRepository implements IProcedureRepository {
  load(name: string, workingDir?: string): string {
    return loadProcedure(name, workingDir)
  }

  exists(name: string, workingDir?: string): boolean {
    return procedureExists(name, workingDir)
  }
}

export function loadProcedure(name: string, workingDir?: string): string {
  if (workingDir) {
    const localPath = join(workingDir, 'procedures', `${name}.md`)
    if (fileExists(localPath)) {
      return readText(localPath)
    }
  }
  const packagePath = join(PACKAGE_PROCEDURES_DIR, `${name}.md`)
  if (!fileExists(packagePath)) {
    throw new ProcedureNotFoundError(name)
  }
  return readText(packagePath)
}

export function procedureExists(name: string, workingDir?: string): boolean {
  if (workingDir) {
    const localPath = join(workingDir, 'procedures', `${name}.md`)
    if (fileExists(localPath)) return true
  }
  return fileExists(join(PACKAGE_PROCEDURES_DIR, `${name}.md`))
}
