import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const DEFAULT_MAX_DEPTH = 10

export class KnowledgeReaderInfra {
  listFilesRecursive(
    dir: string,
    ext?: string,
    maxDepth: number = DEFAULT_MAX_DEPTH
  ): { absolute: string; relative: string }[] {
    if (!existsSync(dir)) return []
    const results: { absolute: string; relative: string }[] = []
    const traverse = (current: string, depth: number): void => {
      if (depth > maxDepth) return
      for (const entry of readdirSync(current)) {
        const full = join(current, entry)
        if (statSync(full).isDirectory()) {
          traverse(full, depth + 1)
        } else if (!ext || entry.endsWith(ext)) {
          results.push({ absolute: full, relative: relative(dir, full) })
        }
      }
    }
    traverse(dir, 0)
    return results
  }

  readTextFile(path: string): string {
    return readFileSync(path, 'utf-8')
  }
}
