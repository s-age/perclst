import { existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { ProcedureNotFoundError } from '@src/errors/procedureNotFoundError'
import type { IProcedureLoader } from '@src/repositories/procedureLoader'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export class FileProcedureLoader implements IProcedureLoader {
  private proceduresDir: string

  constructor() {
    // Project root procedures/ directory
    // This assumes it's running from src/infrastructure/
    this.proceduresDir = join(__dirname, '../../../procedures')
  }

  load(procedureName: string): string {
    const procedurePath = join(this.proceduresDir, `${procedureName}.md`)
    if (!existsSync(procedurePath)) {
      throw new ProcedureNotFoundError(procedureName)
    }
    return readFileSync(procedurePath, 'utf-8')
  }

  exists(procedureName: string): boolean {
    const procedurePath = join(this.proceduresDir, `${procedureName}.md`)
    return existsSync(procedurePath)
  }
}
