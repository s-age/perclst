import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

export function listFilesRecursive(
  dir: string,
  ext?: string
): { absolute: string; relative: string }[] {
  if (!existsSync(dir)) return []
  const results: { absolute: string; relative: string }[] = []
  const traverse = (current: string) => {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry)
      if (statSync(full).isDirectory()) {
        traverse(full)
      } else if (!ext || entry.endsWith(ext)) {
        results.push({ absolute: full, relative: relative(dir, full) })
      }
    }
  }
  traverse(dir)
  return results
}

export function readTextFile(path: string): string {
  return readFileSync(path, 'utf-8')
}
