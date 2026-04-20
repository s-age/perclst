import { openSync, readSync, writeSync, closeSync } from 'fs'

export function openTty(): number | null {
  try {
    return openSync('/dev/tty', 'r+')
  } catch {
    return null
  }
}

export function writeTty(fd: number, text: string): void {
  writeSync(fd, text)
}

export function readTty(fd: number, maxBytes: number = 256): string {
  const buf = Buffer.alloc(maxBytes)
  const bytesRead = readSync(fd, buf, 0, maxBytes, null)
  return buf.slice(0, bytesRead).toString()
}

export function closeTty(fd: number): void {
  closeSync(fd)
}
