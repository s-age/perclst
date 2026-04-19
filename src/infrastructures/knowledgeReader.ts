import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

export function listFilesRecursive(dir: string, ext?: string): string[] {
  if (!existsSync(dir)) return []
  const results: string[] = []
  const traverse = (current: string) => {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry)
      if (statSync(full).isDirectory()) {
        traverse(full)
      } else if (!ext || entry.endsWith(ext)) {
        results.push(full)
      }
    }
  }
  traverse(dir)
  return results
}

export function readTextFile(path: string): string {
  return readFileSync(path, 'utf-8')
}
