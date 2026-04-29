import { mkdirSync, renameSync } from 'fs'
import { dirname } from 'path'

export class FileMoveInfra {
  moveFile(src: string, dest: string): void {
    mkdirSync(dirname(dest), { recursive: true })
    renameSync(src, dest)
  }
}
