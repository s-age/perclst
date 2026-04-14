import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs'
import { unlink } from 'fs/promises'
import { homedir } from 'os'

export function readJson<T>(path: string): T {
  const content = readFileSync(path, 'utf-8')
  return JSON.parse(content) as T
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

export function listJsonFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((f) => f.endsWith('.json'))
}

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

export function homeDir(): string {
  return homedir()
}
