import { openSync, readSync, writeSync, closeSync } from 'fs'

export class TtyInfra {
  openTty(): number | null {
    try {
      return openSync('/dev/tty', 'r+')
    } catch {
      return null
    }
  }

  writeTty(fd: number, text: string): void {
    writeSync(fd, text)
  }

  readTty(fd: number, maxBytes: number = 256): string {
    const buf = Buffer.alloc(maxBytes)
    const bytesRead = readSync(fd, buf, 0, maxBytes, null)
    return buf.slice(0, bytesRead).toString()
  }

  closeTty(fd: number): void {
    closeSync(fd)
  }
}
