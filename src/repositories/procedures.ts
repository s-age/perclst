import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { IProcedureRepository } from '@src/repositories/ports/agent'
import { ProcedureNotFoundError } from '@src/errors/procedureNotFoundError'
import { fileExists, readText } from '@src/infrastructures/fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROCEDURES_DIR = join(__dirname, '../../../procedures')

export class ProcedureRepository implements IProcedureRepository {
  load(name: string): string {
    return loadProcedure(name)
  }

  exists(name: string): boolean {
    return procedureExists(name)
  }
}

export function loadProcedure(name: string): string {
  const path = join(PROCEDURES_DIR, `${name}.md`)
  if (!fileExists(path)) {
    throw new ProcedureNotFoundError(name)
  }
  return readText(path)
}

export function procedureExists(name: string): boolean {
  return fileExists(join(PROCEDURES_DIR, `${name}.md`))
}
