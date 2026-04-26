import { vi, describe, it, expect, beforeEach } from 'vitest'
import { TestStrategyRepository } from '../../testStrategyRepository'
import type { FsInfra } from '@src/infrastructures/fs'
import type { TsAnalyzer } from '@src/infrastructures/tsAnalyzer'
import type { TestFileDiscoveryInfra } from '@src/infrastructures/testFileDiscovery'

type TestStrategyFs = Pick<FsInfra, 'fileExists' | 'readText' | 'readJson'>

describe('TestStrategyRepository', () => {
  let repo: TestStrategyRepository
  let mockFs: TestStrategyFs

  beforeEach(() => {
    vi.clearAllMocks()
    mockFs = {
      fileExists: vi.fn(),
      readText: vi.fn(),
      readJson: vi.fn()
    } as unknown as TestStrategyFs
    repo = new TestStrategyRepository(
      {} as unknown as TsAnalyzer,
      mockFs,
      {} as unknown as TestFileDiscoveryInfra
    )
  })

  describe('extractTestFunctions', () => {
    it('returns empty array if test file does not exist', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(false)

      expect(repo.extractTestFunctions('nonexistent.test.ts')).toEqual([])
    })

    it('extracts single test name from it() with single quotes', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue("it('should do something', () => {})")

      expect(repo.extractTestFunctions('test.ts')).toContain('should do something')
    })

    it('extracts single test name from it() with double quotes', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue('it("should work", () => {})')

      expect(repo.extractTestFunctions('test.ts')).toContain('should work')
    })

    it('extracts test name from it() with backticks', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue('it(`should do template`, () => {})')

      expect(repo.extractTestFunctions('test.ts')).toContain('should do template')
    })

    it('extracts test name from test() call', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue("test('another test', () => {})")

      expect(repo.extractTestFunctions('test.ts')).toContain('another test')
    })

    it('extracts test name from it.skip() call', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue("it.skip('skipped test', () => {})")

      expect(repo.extractTestFunctions('test.ts')).toContain('skipped test')
    })

    it('extracts test name from test.skip() call', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue("test.skip('skipped test 2', () => {})")

      expect(repo.extractTestFunctions('test.ts')).toContain('skipped test 2')
    })

    it('extracts multiple test functions from single file', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue(`
        it('first test', () => {})
        it('second test', () => {})
        test('third test', () => {})
      `)

      const result = repo.extractTestFunctions('test.ts')

      expect(result).toHaveLength(3)
      expect(result).toContain('first test')
      expect(result).toContain('second test')
      expect(result).toContain('third test')
    })

    it('ignores commented out test definitions', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue(`
        // it('commented test', () => {})
        it('real test', () => {})
      `)

      expect(repo.extractTestFunctions('test.ts')).toContain('real test')
    })

    it('extracts test names with special characters', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue("it('should handle @#$ chars', () => {})")

      expect(repo.extractTestFunctions('test.ts')).toContain('should handle @#$ chars')
    })

    it('handles empty test file', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue('')

      expect(repo.extractTestFunctions('empty.test.ts')).toEqual([])
    })

    it('handles test file with no test definitions', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue('const x = 42\nconst y = 43')

      expect(repo.extractTestFunctions('notest.ts')).toEqual([])
    })
  })

  describe('readPackageDeps', () => {
    it('returns merged dependencies from package.json', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readJson).mockReturnValue({ dependencies: { vitest: '^1.0.0' } })

      expect(repo.readPackageDeps('/project/src/file.ts')).toEqual({ vitest: '^1.0.0' })
    })

    it('returns devDependencies when only devDependencies present', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readJson).mockReturnValue({ devDependencies: { vitest: '^1.0.0' } })

      expect(repo.readPackageDeps('/project/src/file.ts')).toEqual({ vitest: '^1.0.0' })
    })

    it('merges dependencies and devDependencies', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readJson).mockReturnValue({
        dependencies: { react: '^18.0.0' },
        devDependencies: { vitest: '^1.0.0', jest: '^29.0.0' }
      })

      expect(repo.readPackageDeps('/project/src/file.ts')).toEqual({
        react: '^18.0.0',
        vitest: '^1.0.0',
        jest: '^29.0.0'
      })
    })

    it('returns null when no package.json found', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(false)

      expect(repo.readPackageDeps('/project/src/file.ts')).toBeNull()
    })

    it('searches up directory tree for package.json', () => {
      vi.mocked(mockFs.fileExists)
        .mockReturnValueOnce(false) // nested/package.json
        .mockReturnValueOnce(true) // parent/package.json
      vi.mocked(mockFs.readJson).mockReturnValue({ devDependencies: { vitest: '^1.0.0' } })

      expect(repo.readPackageDeps('/project/nested/file.ts')).toEqual({ vitest: '^1.0.0' })
    })

    it('returns null when search exceeds 20 levels without finding package.json', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(false)

      expect(
        repo.readPackageDeps('/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/file.ts')
      ).toBeNull()
    })

    it('returns null when readJson throws', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readJson).mockImplementation(() => {
        throw new Error('Invalid JSON')
      })

      expect(repo.readPackageDeps('/project/src/file.ts')).toBeNull()
    })
  })
})
