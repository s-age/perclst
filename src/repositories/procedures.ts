import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { ProcedureNotFoundError } from '@src/errors/procedureNotFoundError'
import { fileExists } from '@src/infrastructures/fs'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROCEDURES_DIR = join(__dirname, '../../../procedures')

export function loadProcedure(name: string): string {
  const path = join(PROCEDURES_DIR, `${name}.md`)
  if (!fileExists(path)) {
    throw new ProcedureNotFoundError(name)
  }
  return readFileSync(path, 'utf-8')
}

export function procedureExists(name: string): boolean {
  return fileExists(join(PROCEDURES_DIR, `${name}.md`))
}
