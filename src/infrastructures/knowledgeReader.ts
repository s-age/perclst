import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

export function listMarkdownFilesRecursive(dir: string): string[] {
  if (!existsSync(dir)) return []
  const results: string[] = []
  const traverse = (current: string) => {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry)
      if (statSync(full).isDirectory()) {
        traverse(full)
      } else if (entry.endsWith('.md')) {
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
