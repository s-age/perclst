import { vi, describe, it, expect, beforeEach } from 'vitest'
import { canonicalTestFilePath, findTestFile } from '../testStrategyRepository'

vi.mock('@src/infrastructures/fs', () => ({
  fileExists: vi.fn()
}))

vi.mock('@src/infrastructures/testFileDiscovery', () => ({
  searchDir: vi.fn()
}))

import { fileExists } from '@src/infrastructures/fs'
import { searchDir } from '@src/infrastructures/testFileDiscovery'

describe('testStrategyRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =========================================================================
  // canonicalTestFilePath — pure path transformation (no I/O)
  // =========================================================================

  describe('canonicalTestFilePath', () => {
    it('transforms .ts file to __tests__/filename.test.ts', () => {
      const result = canonicalTestFilePath('/path/to/myFile.ts')
      expect(result).toBe('/path/to/__tests__/myFile.test.ts')
    })

    it('transforms .tsx file to __tests__/filename.test.tsx', () => {
      const result = canonicalTestFilePath('/src/components/Button.tsx')
      expect(result).toBe('/src/components/__tests__/Button.test.tsx')
    })

    it('transforms .js file to __tests__/filename.test.js', () => {
      const result = canonicalTestFilePath('/lib/utils.js')
      expect(result).toBe('/lib/__tests__/utils.test.js')
    })

    it('handles relative paths by resolving to absolute', () => {
      const result = canonicalTestFilePath('./myFile.ts')
      expect(result).toMatch(/__tests__\/myFile\.test\.ts$/)
    })

    it('handles file names with multiple dots', () => {
      const result = canonicalTestFilePath('/path/my.file.name.ts')
      expect(result).toBe('/path/__tests__/my.file.name.test.ts')
    })
  })

  // =========================================================================
  // findTestFile — multi-step discovery strategy
  // =========================================================================

  describe('findTestFile', () => {
    it('finds .test file in same directory', () => {
      vi.mocked(fileExists).mockImplementation((path: string) => path === '/src/myFile.test.ts')

      const result = findTestFile('/src/myFile.ts')
      expect(result).toBe('/src/myFile.test.ts')
    })

    it('finds .spec file in same directory when .test is absent', () => {
      vi.mocked(fileExists).mockImplementation((path: string) => path === '/src/myFile.spec.ts')

      const result = findTestFile('/src/myFile.ts')
      expect(result).toBe('/src/myFile.spec.ts')
    })

    it('finds .test file in __tests__ subdirectory', () => {
      vi.mocked(fileExists).mockImplementation(
        (path: string) => path === '/src/__tests__/myFile.test.ts'
      )

      const result = findTestFile('/src/myFile.ts')
      expect(result).toBe('/src/__tests__/myFile.test.ts')
    })

    it('finds .spec file in __tests__ subdirectory', () => {
      vi.mocked(fileExists).mockImplementation(
        (path: string) => path === '/src/__tests__/myFile.spec.ts'
      )

      const result = findTestFile('/src/myFile.ts')
      expect(result).toBe('/src/__tests__/myFile.spec.ts')
    })

    it('prefers .test in same directory over .spec when both exist', () => {
      vi.mocked(fileExists).mockImplementation(
        (path: string) => path === '/src/myFile.test.ts' || path === '/src/myFile.spec.ts'
      )

      const result = findTestFile('/src/myFile.ts')
      expect(result).toBe('/src/myFile.test.ts')
    })

    it('walks up to .git root and delegates to searchDir', () => {
      vi.mocked(fileExists).mockImplementation((path: string) => {
        if (path === '/repo/.git') return true
        return false
      })
      vi.mocked(searchDir).mockImplementation((dir: string) => {
        if (dir === '/repo/tests') return '/repo/tests/myFile.test.ts'
        return null
      })

      const result = findTestFile('/repo/src/myFile.ts')
      expect(result).toBe('/repo/tests/myFile.test.ts')
    })

    it('tries tests, test, __tests__ directories at git root in order', () => {
      vi.mocked(fileExists).mockImplementation((path: string) => path === '/repo/.git')
      vi.mocked(searchDir).mockImplementation((dir: string) => {
        if (dir === '/repo/test') return '/repo/test/myFile.test.ts'
        return null
      })

      const result = findTestFile('/repo/src/myFile.ts')
      expect(result).toBe('/repo/test/myFile.test.ts')
    })

    it('finds in __tests__ root directory when tests and test are absent', () => {
      vi.mocked(fileExists).mockImplementation((path: string) => path === '/repo/.git')
      vi.mocked(searchDir).mockImplementation((dir: string) => {
        if (dir === '/repo/__tests__') return '/repo/__tests__/myFile.test.ts'
        return null
      })

      const result = findTestFile('/repo/src/myFile.ts')
      expect(result).toBe('/repo/__tests__/myFile.test.ts')
    })

    it('stops searching upward once .git is found', () => {
      vi.mocked(fileExists).mockImplementation((path: string) => path === '/repo/.git')
      vi.mocked(searchDir).mockReturnValue(null)

      findTestFile('/repo/src/myFile.ts')

      // searchDir should only be called for the git root directories
      expect(vi.mocked(searchDir)).toHaveBeenCalledTimes(3)
      expect(vi.mocked(fileExists)).toHaveBeenCalledWith('/repo/.git')
    })

    it('returns null when no test file is found anywhere', () => {
      vi.mocked(fileExists).mockReturnValue(false)

      const result = findTestFile('/src/myFile.ts')
      expect(result).toBeNull()
    })

    it('returns null when .git is never found within 20 levels', () => {
      vi.mocked(fileExists).mockReturnValue(false)

      const result = findTestFile('/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z/myFile.ts')
      expect(result).toBeNull()
    })

    it('handles .tsx files', () => {
      vi.mocked(fileExists).mockImplementation((path: string) => path === '/src/Component.test.tsx')

      const result = findTestFile('/src/Component.tsx')
      expect(result).toBe('/src/Component.test.tsx')
    })

    it('handles .jsx files', () => {
      vi.mocked(fileExists).mockImplementation((path: string) => path === '/src/Component.test.jsx')

      const result = findTestFile('/src/Component.jsx')
      expect(result).toBe('/src/Component.test.jsx')
    })
  })
})
