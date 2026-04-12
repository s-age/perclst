import { existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { ProcedureNotFoundError } from '@src/lib/utils/errors'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export class ProcedureLoader {
  private proceduresDir: string

  constructor() {
    // procedures/ directory at project root
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
