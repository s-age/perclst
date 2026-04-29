import { vi, describe, it, expect, beforeEach } from 'vitest'
import { TestStrategyRepository } from '../testStrategyRepository'
import type { FsInfra } from '@src/infrastructures/fs'
import type { TsAnalyzer } from '@src/infrastructures/tsAnalyzer'
import type { TestFileDiscoveryInfra } from '@src/infrastructures/testFileDiscovery'

type TestStrategyFs = Pick<FsInfra, 'fileExists' | 'readText'>

describe('canonicalTestFilePath', () => {
  let repo: TestStrategyRepository

  beforeEach(() => {
    repo = new TestStrategyRepository(
      {} as unknown as TsAnalyzer,
      { fileExists: vi.fn(), readText: vi.fn() } as unknown as TestStrategyFs,
      {} as unknown as TestFileDiscoveryInfra
    )
  })

  it('transforms .ts file to __tests__/filename.test.ts', () => {
    expect(repo.canonicalTestFilePath('/path/to/myFile.ts')).toBe(
      '/path/to/__tests__/myFile.test.ts'
    )
  })

  it('transforms .tsx file to __tests__/filename.test.tsx', () => {
    expect(repo.canonicalTestFilePath('/src/components/Button.tsx')).toBe(
      '/src/components/__tests__/Button.test.tsx'
    )
  })

  it('transforms .js file to __tests__/filename.test.js', () => {
    expect(repo.canonicalTestFilePath('/lib/utils.js')).toBe('/lib/__tests__/utils.test.js')
  })

  it('handles relative paths by resolving to absolute', () => {
    expect(repo.canonicalTestFilePath('./myFile.ts')).toMatch(/__tests__\/myFile\.test\.ts$/)
  })

  it('handles file names with multiple dots', () => {
    expect(repo.canonicalTestFilePath('/path/my.file.name.ts')).toBe(
      '/path/__tests__/my.file.name.test.ts'
    )
  })
})

describe('TestStrategyRepository', () => {
  let repo: TestStrategyRepository
  let mockFs: TestStrategyFs
  let mockFileDiscovery: TestFileDiscoveryInfra

  beforeEach(() => {
    vi.clearAllMocks()
    mockFs = {
      fileExists: vi.fn(),
      readText: vi.fn()
    } as unknown as TestStrategyFs
    mockFileDiscovery = {
      searchDir: vi.fn()
    } as unknown as TestFileDiscoveryInfra
    repo = new TestStrategyRepository({} as unknown as TsAnalyzer, mockFs, mockFileDiscovery)
  })

  describe('findTestFile', () => {
    it('finds .test file in same directory', () => {
      vi.mocked(mockFs.fileExists).mockImplementation(
        (path: string) => path === '/src/myFile.test.ts'
      )

      expect(repo.findTestFile('/src/myFile.ts')).toBe('/src/myFile.test.ts')
    })

    it('finds .spec file in same directory when .test is absent', () => {
      vi.mocked(mockFs.fileExists).mockImplementation(
        (path: string) => path === '/src/myFile.spec.ts'
      )

      expect(repo.findTestFile('/src/myFile.ts')).toBe('/src/myFile.spec.ts')
    })

    it('finds .test file in __tests__ subdirectory', () => {
      vi.mocked(mockFs.fileExists).mockImplementation(
        (path: string) => path === '/src/__tests__/myFile.test.ts'
      )

      expect(repo.findTestFile('/src/myFile.ts')).toBe('/src/__tests__/myFile.test.ts')
    })

    it('finds .spec file in __tests__ subdirectory', () => {
      vi.mocked(mockFs.fileExists).mockImplementation(
        (path: string) => path === '/src/__tests__/myFile.spec.ts'
      )

      expect(repo.findTestFile('/src/myFile.ts')).toBe('/src/__tests__/myFile.spec.ts')
    })

    it('prefers .test in same directory over .spec when both exist', () => {
      vi.mocked(mockFs.fileExists).mockImplementation(
        (path: string) => path === '/src/myFile.test.ts' || path === '/src/myFile.spec.ts'
      )

      expect(repo.findTestFile('/src/myFile.ts')).toBe('/src/myFile.test.ts')
    })

    it('walks up to .git root and delegates to searchDir', () => {
      vi.mocked(mockFs.fileExists).mockImplementation((path: string) => {
        if (path === '/repo/.git') return true
        return false
      })
      vi.mocked(mockFileDiscovery.searchDir).mockImplementation((dir: string) => {
        if (dir === '/repo/tests') return '/repo/tests/myFile.test.ts'
        return null
      })

      expect(repo.findTestFile('/repo/src/myFile.ts')).toBe('/repo/tests/myFile.test.ts')
    })

    it('tries tests, test, __tests__ directories at git root in order', () => {
      vi.mocked(mockFs.fileExists).mockImplementation((path: string) => path === '/repo/.git')
      vi.mocked(mockFileDiscovery.searchDir).mockImplementation((dir: string) => {
        if (dir === '/repo/test') return '/repo/test/myFile.test.ts'
        return null
      })

      expect(repo.findTestFile('/repo/src/myFile.ts')).toBe('/repo/test/myFile.test.ts')
    })

    it('finds in __tests__ root directory when tests and test are absent', () => {
      vi.mocked(mockFs.fileExists).mockImplementation((path: string) => path === '/repo/.git')
      vi.mocked(mockFileDiscovery.searchDir).mockImplementation((dir: string) => {
        if (dir === '/repo/__tests__') return '/repo/__tests__/myFile.test.ts'
        return null
      })

      expect(repo.findTestFile('/repo/src/myFile.ts')).toBe('/repo/__tests__/myFile.test.ts')
    })

    it('stops searching upward once .git is found', () => {
      vi.mocked(mockFs.fileExists).mockImplementation((path: string) => path === '/repo/.git')
      vi.mocked(mockFileDiscovery.searchDir).mockReturnValue(null)

      repo.findTestFile('/repo/src/myFile.ts')

      expect(vi.mocked(mockFileDiscovery.searchDir)).toHaveBeenCalledTimes(3)
      expect(vi.mocked(mockFs.fileExists)).toHaveBeenCalledWith('/repo/.git')
    })

    it('returns null when no test file is found anywhere', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(false)

      expect(repo.findTestFile('/src/myFile.ts')).toBeNull()
    })

    it('returns null when .git is never found within 20 levels', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(false)

      expect(
        repo.findTestFile('/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z/myFile.ts')
      ).toBeNull()
    })

    it('handles .tsx files', () => {
      vi.mocked(mockFs.fileExists).mockImplementation(
        (path: string) => path === '/src/Component.test.tsx'
      )

      expect(repo.findTestFile('/src/Component.tsx')).toBe('/src/Component.test.tsx')
    })

    it('handles .jsx files', () => {
      vi.mocked(mockFs.fileExists).mockImplementation(
        (path: string) => path === '/src/Component.test.jsx'
      )

      expect(repo.findTestFile('/src/Component.jsx')).toBe('/src/Component.test.jsx')
    })
  })
})
