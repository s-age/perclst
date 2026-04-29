import { existsSync, readdirSync } from 'fs'
import { join } from 'path'

export class TestFileDiscoveryInfra {
  searchDir(dir: string, stem: string, ext: string): string | null {
    if (!existsSync(dir)) return null
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
          const found = this.searchDir(full, stem, ext)
          if (found) return found
        } else if (entry.name === `${stem}.test${ext}` || entry.name === `${stem}.spec${ext}`) {
          return full
        }
      }
    } catch {
      // ignore permission errors
    }
    return null
  }
}
