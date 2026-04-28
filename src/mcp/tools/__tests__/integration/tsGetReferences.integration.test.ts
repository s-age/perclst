import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { executeTsGetReferences } from '../../tsGetReferences'
import { setupContainer } from '@src/core/di/setup'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { makeTmpDir, buildTestConfig } from '@src/__tests__/helpers'
import type { TsAnalysisService } from '@src/services/tsAnalysisService'
import type { RecursiveReferenceInfo } from '@src/types/tsAnalysis'

describe('executeTsGetReferences (integration)', () => {
  let dir: string
  let cleanup: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())
    setupContainer({ config: buildTestConfig(dir) })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('references array lists all call sites when symbol is used across multiple consumer files', async () => {
      const sourcePath = join(dir, 'source.ts')
      const consumer1Path = join(dir, 'consumer1.ts')
      const consumer2Path = join(dir, 'consumer2.ts')

      writeFileSync(sourcePath, 'export function myFunc(): string { return "hello" }\n')
      writeFileSync(consumer1Path, "import { myFunc } from './source'\nconst a = myFunc()\n")
      writeFileSync(consumer2Path, "import { myFunc } from './source'\nconst b = myFunc()\n")

      // Pre-add consumer files to the ts-morph project so findReferences can discover cross-file usage
      const service = container.resolve<TsAnalysisService>(TOKENS.TsAnalysisService)
      service.analyze(consumer1Path)
      service.analyze(consumer2Path)

      const result = await executeTsGetReferences({ file_path: sourcePath, symbol_name: 'myFunc' })
      const parsed = JSON.parse(result.content[0].text) as {
        symbol: string
        references: RecursiveReferenceInfo[]
      }

      expect(parsed.references.length).toBeGreaterThan(1)
    })

    it('references array is empty when the symbol has no callers in non-test files', async () => {
      // Place the fixture under a __tests__ subdir: extractReferences filters those paths
      // when include_test is false (the default), so the declaration site is excluded and
      // the returned references array is truly empty.
      const testSubDir = join(dir, '__tests__')
      mkdirSync(testSubDir)
      const sourcePath = join(testSubDir, 'source.ts')
      writeFileSync(sourcePath, 'export function isolatedFunc(): void {}\n')

      const result = await executeTsGetReferences({
        file_path: sourcePath,
        symbol_name: 'isolatedFunc'
      })
      const parsed = JSON.parse(result.content[0].text) as {
        symbol: string
        references: RecursiveReferenceInfo[]
      }

      expect(parsed.references).toHaveLength(0)
    })
  })

  describe('error path', () => {
    it('content text contains the queried symbol with empty references when symbol_name does not exist in the file', async () => {
      const sourcePath = join(dir, 'source.ts')
      writeFileSync(sourcePath, 'export function myFunc(): string { return "hello" }\n')

      const result = await executeTsGetReferences({
        file_path: sourcePath,
        symbol_name: 'nonExistentSymbol'
      })
      const parsed = JSON.parse(result.content[0].text) as {
        symbol: string
        references: RecursiveReferenceInfo[]
      }

      expect(parsed).toEqual({ symbol: 'nonExistentSymbol', references: [] })
    })
  })
})
