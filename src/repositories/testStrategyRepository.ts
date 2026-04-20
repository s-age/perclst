import type { ITestStrategyRepository } from '@src/repositories/ports/testStrategy'
import type { RawFunctionInfo, TestFramework } from '@src/types/testStrategy'
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

export function parseFunctionsFromFile(filePath: string): RawFunctionInfo[] | null {
  const sf = new TsAnalyzer({ skipAddingFilesFromTsConfig: true }).getSourceFileIfExists(filePath)
  return sf ? _parseFunctions(sf) : null
}

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

export function detectFramework(targetFilePath: string): TestFramework {
  let current = dirname(targetFilePath)
  for (let i = 0; i < 20; i++) {
    const pkgPath = join(current, 'package.json')
    if (fileExists(pkgPath)) {
      try {
        const pkg = readJson<Record<string, Record<string, string>>>(pkgPath)
        const deps = { ...pkg['dependencies'], ...pkg['devDependencies'] }
        if ('vitest' in deps) return 'vitest'
      } catch {
        // fall through to default
      }
      break
    }
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }
  return 'jest'
}

// ---------------------------------------------------------------------------
// Class form
// ---------------------------------------------------------------------------

export class TestStrategyRepository implements ITestStrategyRepository {
  parseFunctions(filePath: string): RawFunctionInfo[] | null {
    return parseFunctionsFromFile(filePath)
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

  detectFramework(targetFilePath: string): TestFramework {
    return detectFramework(targetFilePath)
  }
}
