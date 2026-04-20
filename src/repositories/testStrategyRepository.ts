import type { ITestStrategyRepository } from '@src/repositories/ports/testStrategy'
import type { RawFunctionInfo } from '@src/types/testStrategy'
import { TsAnalyzer } from '@src/infrastructures/tsAnalyzer'
import { searchDir } from '@src/infrastructures/testFileDiscovery'
import { fileExists, readText, readJson } from '@src/infrastructures/fs'
import {
  parseFunctions as _parseFunctions,
  parseTestFunctionNames
} from '@src/repositories/parsers/tsParser'
import { dirname, join, basename, extname, resolve } from 'path'

// ---------------------------------------------------------------------------
// Standalone functions
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
    if (fileExists(p)) return p
  }

  let current = dir
  for (let i = 0; i < 20; i++) {
    if (fileExists(join(current, '.git'))) {
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

export function extractTestFunctions(testFilePath: string): string[] {
  if (!fileExists(testFilePath)) return []
  return parseTestFunctionNames(readText(testFilePath))
}

export function readPackageDeps(targetFilePath: string): Record<string, string> | null {
  let current = dirname(targetFilePath)
  for (let i = 0; i < 20; i++) {
    const pkgPath = join(current, 'package.json')
    if (fileExists(pkgPath)) {
      try {
        const pkg = readJson<Record<string, Record<string, string>>>(pkgPath)
        return { ...pkg['dependencies'], ...pkg['devDependencies'] }
      } catch {
        return null
      }
    }
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }
  return null
}

// ---------------------------------------------------------------------------
// Class form
// ---------------------------------------------------------------------------

export class TestStrategyRepository implements ITestStrategyRepository {
  constructor(private readonly tsAnalyzer: TsAnalyzer) {}

  parseFunctions(filePath: string): RawFunctionInfo[] | null {
    const sf = this.tsAnalyzer.getSourceFileIfExists(filePath)
    return sf ? _parseFunctions(sf) : null
  }

  findTestFile(targetFilePath: string): string | null {
    return findTestFile(targetFilePath)
  }

  canonicalTestFilePath(targetFilePath: string): string {
    return canonicalTestFilePath(targetFilePath)
  }

  extractTestFunctions(testFilePath: string): string[] {
    return extractTestFunctions(testFilePath)
  }

  readPackageDeps(targetFilePath: string): Record<string, string> | null {
    return readPackageDeps(targetFilePath)
  }
}
