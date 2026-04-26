import type { ITestStrategyRepository } from '@src/repositories/ports/testStrategy'
import type { RawFunctionInfo } from '@src/types/testStrategy'
import type { TsAnalyzer } from '@src/infrastructures/tsAnalyzer'
import type { FsInfra } from '@src/infrastructures/fs'
import type { TestFileDiscoveryInfra } from '@src/infrastructures/testFileDiscovery'
import {
  parseFunctions as _parseFunctions,
  parseTestFunctionNames
} from '@src/repositories/parsers/tsParser'
import { dirname, join, basename, extname, resolve } from 'path'

type TestStrategyFs = Pick<FsInfra, 'fileExists' | 'readText' | 'readJson'>

export function canonicalTestFilePath(targetFilePath: string): string {
  const abs = resolve(targetFilePath)
  const dir = dirname(abs)
  const stem = basename(abs, extname(abs))
  const ext = extname(abs)
  return join(dir, '__tests__', `${stem}.test${ext}`)
}

export class TestStrategyRepository implements ITestStrategyRepository {
  constructor(
    private readonly tsAnalyzer: TsAnalyzer,
    private readonly fs: TestStrategyFs,
    private readonly fileDiscovery: TestFileDiscoveryInfra
  ) {}

  parseFunctions(filePath: string): RawFunctionInfo[] | null {
    const sf = this.tsAnalyzer.getSourceFileIfExists(filePath)
    return sf ? _parseFunctions(sf) : null
  }

  findTestFile(targetFilePath: string): string | null {
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
      if (this.fs.fileExists(p)) return p
    }

    let current = dir
    for (let i = 0; i < 20; i++) {
      if (this.fs.fileExists(join(current, '.git'))) {
        for (const testDir of ['tests', 'test', '__tests__']) {
          const found = this.fileDiscovery.searchDir(join(current, testDir), stem, ext)
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

  canonicalTestFilePath(targetFilePath: string): string {
    return canonicalTestFilePath(targetFilePath)
  }

  extractTestFunctions(testFilePath: string): string[] {
    if (!this.fs.fileExists(testFilePath)) return []
    return parseTestFunctionNames(this.fs.readText(testFilePath))
  }

  readPackageDeps(targetFilePath: string): Record<string, string> | null {
    let current = dirname(targetFilePath)
    for (let i = 0; i < 20; i++) {
      const pkgPath = join(current, 'package.json')
      if (this.fs.fileExists(pkgPath)) {
        try {
          const pkg = this.fs.readJson<Record<string, Record<string, string>>>(pkgPath)
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
}
