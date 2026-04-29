import {
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  readdirSync,
  mkdirSync,
  statSync,
  createReadStream,
  type Dirent
} from 'fs'
import { unlink } from 'fs/promises'
import { createInterface } from 'readline'
import { homedir, tmpdir } from 'os'
export class FsInfra {
  fileExists(path: string): boolean {
    return existsSync(path)
  }

  removeFile(path: string): Promise<void> {
    return unlink(path)
  }

  listFiles(dir: string, ext: string): string[] {
    if (!existsSync(dir)) return []
    return readdirSync(dir).filter((f) => f.endsWith(ext))
  }

  ensureDir(dir: string): void {
    mkdirSync(dir, { recursive: true })
  }

  readText(path: string): string {
    return readFileSync(path, 'utf-8')
  }

  writeText(path: string, content: string): void {
    writeFileSync(path, content, 'utf-8')
  }

  removeFileSync(path: string): void {
    unlinkSync(path)
  }

  async *readLines(path: string): AsyncGenerator<string> {
    const rl = createInterface({
      input: createReadStream(path, 'utf-8'),
      crlfDelay: Infinity
    })
    for await (const line of rl) {
      yield line
    }
  }

  homeDir(): string {
    return homedir()
  }

  tmpDir(): string {
    return tmpdir()
  }

  currentWorkingDir(): string {
    return process.cwd()
  }

  listDirEntries(dir: string): Dirent[] {
    return readdirSync(dir, { withFileTypes: true })
  }

  isDirectory(path: string): boolean {
    return statSync(path).isDirectory()
  }
}
