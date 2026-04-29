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
import { join } from 'path'
import { homedir } from 'os'
import { parseYaml, stringifyYaml } from '@src/utils/yaml'

export class FsInfra {
  readJson<T>(path: string): T {
    return JSON.parse(readFileSync(path, 'utf-8')) as T
  }

  writeJson(path: string, data: unknown): void {
    writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8')
  }

  readYaml<T>(path: string): T {
    return parseYaml(readFileSync(path, 'utf-8')) as T
  }

  writeYaml(path: string, data: unknown): void {
    writeFileSync(path, stringifyYaml(data), 'utf-8')
  }

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

  cleanDir(dirPath: string): void {
    if (!existsSync(dirPath)) return
    for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
      if (entry.isFile()) {
        try {
          unlinkSync(join(dirPath, entry.name))
        } catch {
          // ignore locked or already removed files
        }
      }
    }
  }

  homeDir(): string {
    return homedir()
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
