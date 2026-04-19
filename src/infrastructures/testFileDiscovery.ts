import { existsSync, readdirSync } from 'fs'
import { dirname, join, basename, extname, resolve } from 'path'

// ---------------------------------------------------------------------------
// Public: test file discovery — pure FS traversal
// ---------------------------------------------------------------------------

export function canonicalTestFilePath(targetFilePath: string): string {
  const abs = resolve(targetFilePath)
  const dir = dirname(abs)
  const stem = basename(abs, extname(abs))
  const ext = extname(abs)
  return join(dir, '__tests__', `${stem}.test${ext}`)
}

export function findTestFile(targetFilePath: string): string | null {
  const abs = resolve(targetFilePath)
  const dir = dirname(abs)
  const stem = basename(abs, extname(abs))
  const ext = extname(abs)

  const nearby = [
    join(dir, `${stem}.test${ext}`),
    join(dir, `${stem}.spec${ext}`),
    join(dir, '__tests__', `${stem}.test${ext}`),
    join(dir, '__tests__', `${stem}.spec${ext}`)
  ]
  for (const p of nearby) {
    if (existsSync(p)) return p
  }

  let current = dir
  for (let i = 0; i < 20; i++) {
    if (existsSync(join(current, '.git'))) {
      for (const testDir of ['tests', 'test', '__tests__']) {
        const found = searchDir(join(current, testDir), stem, ext)
        if (found) return found
      }
      break
    }
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }
  return null
}

function searchDir(dir: string, stem: string, ext: string): string | null {
  if (!existsSync(dir)) return null
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        const found = searchDir(full, stem, ext)
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
