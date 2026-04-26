import { mkdirSync, renameSync } from 'fs'
import { dirname } from 'path'

export function moveFile(src: string, dest: string): void {
  mkdirSync(dirname(dest), { recursive: true })
  renameSync(src, dest)
}

export class FileMoveInfra {
  moveFile(src: string, dest: string): void {
    moveFile(src, dest)
  }
}
