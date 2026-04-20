import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  statSync,
  type Dirent
} from 'fs'
import { unlink } from 'fs/promises'
import { homedir } from 'os'

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T
}

export function writeJson(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8')
}

export function fileExists(path: string): boolean {
  return existsSync(path)
}

export function removeFile(path: string): Promise<void> {
  return unlink(path)
}

export function listFiles(dir: string, ext: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((f) => f.endsWith(ext))
}

export function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true })
}

export function readText(path: string): string {
  return readFileSync(path, 'utf-8')
}

export function homeDir(): string {
  return homedir()
}

export function currentWorkingDir(): string {
  return process.cwd()
}

export function listDirEntries(dir: string): Dirent[] {
  return readdirSync(dir, { withFileTypes: true })
}

export function isDirectory(path: string): boolean {
  return statSync(path).isDirectory()
}
