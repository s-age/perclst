import {
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  readdirSync,
  mkdirSync,
  statSync,
  type Dirent
} from 'fs'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import { parseYaml, stringifyYaml } from '@src/utils/yaml'

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T
}

export function writeJson(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8')
}

export function readYaml<T>(path: string): T {
  return parseYaml(readFileSync(path, 'utf-8')) as T
}

export function writeYaml(path: string, data: unknown): void {
  writeFileSync(path, stringifyYaml(data), 'utf-8')
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

export function writeText(path: string, content: string): void {
  writeFileSync(path, content, 'utf-8')
}

export function removeFileSync(path: string): void {
  unlinkSync(path)
}

export function cleanDir(dirPath: string): void {
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

export class FsInfra {
  readJson<T>(path: string): T {
    return readJson<T>(path)
  }
  writeJson(path: string, data: unknown): void {
    writeJson(path, data)
  }
  readYaml<T>(path: string): T {
    return readYaml<T>(path)
  }
  writeYaml(path: string, data: unknown): void {
    writeYaml(path, data)
  }
  fileExists(path: string): boolean {
    return fileExists(path)
  }
  removeFile(path: string): Promise<void> {
    return removeFile(path)
  }
  listFiles(dir: string, ext: string): string[] {
    return listFiles(dir, ext)
  }
  ensureDir(dir: string): void {
    ensureDir(dir)
  }
  readText(path: string): string {
    return readText(path)
  }
  writeText(path: string, content: string): void {
    writeText(path, content)
  }
  removeFileSync(path: string): void {
    removeFileSync(path)
  }
  cleanDir(dirPath: string): void {
    cleanDir(dirPath)
  }
  homeDir(): string {
    return homeDir()
  }
  currentWorkingDir(): string {
    return currentWorkingDir()
  }
  listDirEntries(dir: string): Dirent[] {
    return listDirEntries(dir)
  }
  isDirectory(path: string): boolean {
    return isDirectory(path)
  }
}
