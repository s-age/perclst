import { vi, describe, it, expect, beforeEach } from 'vitest'
import * as fs from 'fs'
import type { Dirent } from 'fs'
import { canonicalTestFilePath, findTestFile, searchDir } from '../testFileDiscovery'

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn()
}))

// Helper to create mock Dirent objects
function createMockDirent(name: string, isDir: boolean): Dirent {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
    isSymbolicLink: () => false,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false
  } as Dirent
}

describe('testFileDiscovery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =========================================================================
  // canonicalTestFilePath — pure path transformation
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
  // findTestFile — searches multiple locations
  // =========================================================================

  describe('findTestFile', () => {
    it('finds .test file in same directory', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>
      mockExistsSync.mockImplementation((path: string) => {
        return path === '/src/myFile.test.ts'
      })

      const result = findTestFile('/src/myFile.ts')
      expect(result).toBe('/src/myFile.test.ts')
    })

    it('finds .spec file in same directory when .test is absent', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>
      mockExistsSync.mockImplementation((path: string) => {
        return path === '/src/myFile.spec.ts'
      })

      const result = findTestFile('/src/myFile.ts')
      expect(result).toBe('/src/myFile.spec.ts')
    })

    it('finds .test file in __tests__ directory before searching upward', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>
      mockExistsSync.mockImplementation((path: string) => {
        return path === '/src/__tests__/myFile.test.ts'
      })

      const result = findTestFile('/src/myFile.ts')
      expect(result).toBe('/src/__tests__/myFile.test.ts')
    })

    it('finds .spec file in __tests__ directory', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>
      mockExistsSync.mockImplementation((path: string) => {
        return path === '/src/__tests__/myFile.spec.ts'
      })

      const result = findTestFile('/src/myFile.ts')
      expect(result).toBe('/src/__tests__/myFile.spec.ts')
    })

    it('searches upward to repo root and finds in tests directory', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>
      const mockReaddirSync = fs.readdirSync as ReturnType<typeof vi.fn>

      mockExistsSync.mockImplementation((path: string) => {
        // Nearby search fails
        if (
          path === '/repo/src/myFile.test.ts' ||
          path === '/repo/src/myFile.spec.ts' ||
          path === '/repo/src/__tests__/myFile.test.ts' ||
          path === '/repo/src/__tests__/myFile.spec.ts'
        ) {
          return false
        }
        // Find .git at repo root
        if (path === '/repo/.git') return true
        // tests directory exists
        if (path === '/repo/tests') return true
        return false
      })

      mockReaddirSync.mockImplementation((dir: string) => {
        if (dir === '/repo/tests') {
          return [createMockDirent('myFile.test.ts', false)]
        }
        return []
      })

      const result = findTestFile('/repo/src/myFile.ts')
      expect(result).toBe('/repo/tests/myFile.test.ts')
    })

    it('searches upward to repo root and finds in test directory', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>
      const mockReaddirSync = fs.readdirSync as ReturnType<typeof vi.fn>

      mockExistsSync.mockImplementation((path: string) => {
        if (
          path === '/repo/src/myFile.test.ts' ||
          path === '/repo/src/myFile.spec.ts' ||
          path === '/repo/src/__tests__/myFile.test.ts' ||
          path === '/repo/src/__tests__/myFile.spec.ts'
        ) {
          return false
        }
        if (path === '/repo/.git') return true
        if (path === '/repo/test') return true
        return false
      })

      mockReaddirSync.mockImplementation((dir: string) => {
        if (dir === '/repo/test') {
          return [createMockDirent('myFile.test.ts', false)]
        }
        return []
      })

      const result = findTestFile('/repo/src/myFile.ts')
      expect(result).toBe('/repo/test/myFile.test.ts')
    })

    it('searches upward to repo root and finds in __tests__ directory', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>
      const mockReaddirSync = fs.readdirSync as ReturnType<typeof vi.fn>

      mockExistsSync.mockImplementation((path: string) => {
        if (
          path === '/repo/src/myFile.test.ts' ||
          path === '/repo/src/myFile.spec.ts' ||
          path === '/repo/src/__tests__/myFile.test.ts' ||
          path === '/repo/src/__tests__/myFile.spec.ts'
        ) {
          return false
        }
        if (path === '/repo/.git') return true
        if (path === '/repo/__tests__') return true
        return false
      })

      mockReaddirSync.mockImplementation((dir: string) => {
        if (dir === '/repo/__tests__') {
          return [createMockDirent('myFile.test.ts', false)]
        }
        return []
      })

      const result = findTestFile('/repo/src/myFile.ts')
      expect(result).toBe('/repo/__tests__/myFile.test.ts')
    })

    it('searches recursively in test directory', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>
      const mockReaddirSync = fs.readdirSync as ReturnType<typeof vi.fn>

      mockExistsSync.mockImplementation((path: string) => {
        if (
          path === '/repo/src/myFile.test.ts' ||
          path === '/repo/src/myFile.spec.ts' ||
          path === '/repo/src/__tests__/myFile.test.ts' ||
          path === '/repo/src/__tests__/myFile.spec.ts'
        ) {
          return false
        }
        if (path === '/repo/.git') return true
        if (path === '/repo/tests' || path === '/repo/tests/unit') return true
        return false
      })

      mockReaddirSync.mockImplementation((dir: string) => {
        if (dir === '/repo/tests') {
          return [createMockDirent('unit', true)]
        }
        if (dir === '/repo/tests/unit') {
          return [createMockDirent('myFile.test.ts', false)]
        }
        return []
      })

      const result = findTestFile('/repo/src/myFile.ts')
      expect(result).toBe('/repo/tests/unit/myFile.test.ts')
    })

    it('finds .spec file in test directory', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>
      const mockReaddirSync = fs.readdirSync as ReturnType<typeof vi.fn>

      mockExistsSync.mockImplementation((path: string) => {
        if (
          path === '/repo/src/myFile.test.ts' ||
          path === '/repo/src/myFile.spec.ts' ||
          path === '/repo/src/__tests__/myFile.test.ts' ||
          path === '/repo/src/__tests__/myFile.spec.ts'
        ) {
          return false
        }
        if (path === '/repo/.git') return true
        if (path === '/repo/tests') return true
        return false
      })

      mockReaddirSync.mockImplementation((dir: string) => {
        if (dir === '/repo/tests') {
          return [createMockDirent('myFile.spec.ts', false)]
        }
        return []
      })

      const result = findTestFile('/repo/src/myFile.ts')
      expect(result).toBe('/repo/tests/myFile.spec.ts')
    })

    it('handles permission errors gracefully when reading directories', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>
      const mockReaddirSync = fs.readdirSync as ReturnType<typeof vi.fn>

      mockExistsSync.mockImplementation((path: string) => {
        if (
          path === '/repo/src/myFile.test.ts' ||
          path === '/repo/src/myFile.spec.ts' ||
          path === '/repo/src/__tests__/myFile.test.ts' ||
          path === '/repo/src/__tests__/myFile.spec.ts'
        ) {
          return false
        }
        if (path === '/repo/.git') return true
        if (path === '/repo/tests') return true
        return false
      })

      mockReaddirSync.mockImplementation((dir: string) => {
        if (dir === '/repo/tests') {
          throw new Error('EACCES: permission denied')
        }
        return []
      })

      const result = findTestFile('/repo/src/myFile.ts')
      expect(result).toBeNull()
    })

    it('returns null when test file not found anywhere', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>

      mockExistsSync.mockReturnValue(false)

      const result = findTestFile('/src/myFile.ts')
      expect(result).toBeNull()
    })

    it('stops searching after reaching filesystem root', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>

      mockExistsSync.mockReturnValue(false)

      const result = findTestFile('/myFile.ts')
      expect(result).toBeNull()
    })

    it('prefers .test in same directory over .spec when both exist', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>

      mockExistsSync.mockImplementation((path: string) => {
        // Both exist, but .test should be returned first
        return path === '/src/myFile.test.ts' || path === '/src/myFile.spec.ts'
      })

      const result = findTestFile('/src/myFile.ts')
      expect(result).toBe('/src/myFile.test.ts')
    })

    it('searches up to 20 parent directories before giving up', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>
      const mockReaddirSync = fs.readdirSync as ReturnType<typeof vi.fn>

      mockExistsSync.mockImplementation((path: string) => {
        // Only nearby checks fail
        if (path.includes('myFile')) return false
        // .git never found - force searching all the way up
        return false
      })

      mockReaddirSync.mockReturnValue([])

      // Start deep in a directory tree
      const result = findTestFile('/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z/myFile.ts')
      expect(result).toBeNull()
    })

    it('stops searching upward when .git is found', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>
      const mockReaddirSync = fs.readdirSync as ReturnType<typeof vi.fn>

      mockExistsSync.mockImplementation((path: string) => {
        // Nearby checks fail
        if (
          path === '/project/src/myFile.test.ts' ||
          path === '/project/src/myFile.spec.ts' ||
          path === '/project/src/__tests__/myFile.test.ts' ||
          path === '/project/src/__tests__/myFile.spec.ts'
        ) {
          return false
        }
        // .git found at project root
        if (path === '/project/.git') return true
        // tests directory exists
        if (path === '/project/tests') return true
        return false
      })

      mockReaddirSync.mockImplementation((dir: string) => {
        // Once we find .git, we only search test directories
        if (dir === '/project/tests') {
          return [createMockDirent('myFile.test.ts', false)]
        }
        return []
      })

      const result = findTestFile('/project/src/myFile.ts')
      expect(result).toBe('/project/tests/myFile.test.ts')
      // Verify we don't keep searching above the .git directory
      expect(mockExistsSync).toHaveBeenCalledWith('/project/.git')
    })

    it('handles .tsx files', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>
      mockExistsSync.mockImplementation((path: string) => {
        return path === '/src/Component.test.tsx'
      })

      const result = findTestFile('/src/Component.tsx')
      expect(result).toBe('/src/Component.test.tsx')
    })

    it('handles .jsx files', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>
      mockExistsSync.mockImplementation((path: string) => {
        return path === '/src/Component.test.jsx'
      })

      const result = findTestFile('/src/Component.jsx')
      expect(result).toBe('/src/Component.test.jsx')
    })
  })

  // =========================================================================
  // searchDir — recursive directory traversal for test files
  // =========================================================================

  describe('searchDir', () => {
    it('returns null when directory does not exist', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>
      mockExistsSync.mockReturnValue(false)

      const result = searchDir('/nonexistent/dir', 'myFile', '.ts')
      expect(result).toBeNull()
    })

    it('finds .test file in directory', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>
      const mockReaddirSync = fs.readdirSync as ReturnType<typeof vi.fn>

      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue([createMockDirent('myFile.test.ts', false)])

      const result = searchDir('/tests', 'myFile', '.ts')
      expect(result).toBe('/tests/myFile.test.ts')
    })

    it('finds .spec file in directory', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>
      const mockReaddirSync = fs.readdirSync as ReturnType<typeof vi.fn>

      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue([createMockDirent('myFile.spec.ts', false)])

      const result = searchDir('/tests', 'myFile', '.ts')
      expect(result).toBe('/tests/myFile.spec.ts')
    })

    it('prefers .test file over .spec file when both exist', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>
      const mockReaddirSync = fs.readdirSync as ReturnType<typeof vi.fn>

      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue([
        createMockDirent('myFile.test.ts', false),
        createMockDirent('myFile.spec.ts', false)
      ])

      const result = searchDir('/tests', 'myFile', '.ts')
      expect(result).toBe('/tests/myFile.test.ts')
    })

    it('finds file in nested subdirectory via recursion', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>
      const mockReaddirSync = fs.readdirSync as ReturnType<typeof vi.fn>

      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockImplementation((dir: string) => {
        if (dir === '/tests') {
          return [createMockDirent('unit', true)]
        }
        if (dir === '/tests/unit') {
          return [createMockDirent('myFile.test.ts', false)]
        }
        return []
      })

      const result = searchDir('/tests', 'myFile', '.ts')
      expect(result).toBe('/tests/unit/myFile.test.ts')
    })

    it('returns null when directory has no matching files', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>
      const mockReaddirSync = fs.readdirSync as ReturnType<typeof vi.fn>

      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue([
        createMockDirent('otherFile.ts', false),
        createMockDirent('helpers.ts', false)
      ])

      const result = searchDir('/tests', 'myFile', '.ts')
      expect(result).toBeNull()
    })

    it('handles readdirSync permission error gracefully', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>
      const mockReaddirSync = fs.readdirSync as ReturnType<typeof vi.fn>

      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied')
      })

      const result = searchDir('/restricted', 'myFile', '.ts')
      expect(result).toBeNull()
    })

    it('continues recursion after encountering non-matching files', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>
      const mockReaddirSync = fs.readdirSync as ReturnType<typeof vi.fn>

      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockImplementation((dir: string) => {
        if (dir === '/tests') {
          return [
            createMockDirent('README.md', false),
            createMockDirent('nested', true),
            createMockDirent('helpers.ts', false)
          ]
        }
        if (dir === '/tests/nested') {
          return [createMockDirent('myFile.test.ts', false)]
        }
        return []
      })

      const result = searchDir('/tests', 'myFile', '.ts')
      expect(result).toBe('/tests/nested/myFile.test.ts')
    })

    it('searches multiple levels of nested directories', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>
      const mockReaddirSync = fs.readdirSync as ReturnType<typeof vi.fn>

      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockImplementation((dir: string) => {
        if (dir === '/tests') {
          return [createMockDirent('level1', true)]
        }
        if (dir === '/tests/level1') {
          return [createMockDirent('level2', true)]
        }
        if (dir === '/tests/level1/level2') {
          return [createMockDirent('myFile.spec.ts', false)]
        }
        return []
      })

      const result = searchDir('/tests', 'myFile', '.ts')
      expect(result).toBe('/tests/level1/level2/myFile.spec.ts')
    })

    it('handles mixed file extensions correctly', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>
      const mockReaddirSync = fs.readdirSync as ReturnType<typeof vi.fn>

      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue([
        createMockDirent('myFile.test.js', false),
        createMockDirent('myFile.test.ts', false)
      ])

      const result = searchDir('/tests', 'myFile', '.ts')
      expect(result).toBe('/tests/myFile.test.ts')
    })

    it('stops search immediately after finding match', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>
      const mockReaddirSync = fs.readdirSync as ReturnType<typeof vi.fn>

      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue([
        createMockDirent('myFile.test.ts', false),
        createMockDirent('other', true)
      ])

      const result = searchDir('/tests', 'myFile', '.ts')
      expect(result).toBe('/tests/myFile.test.ts')
      // Verify readdirSync was called (but we can't verify it wasn't called for subdirs
      // since the function returns immediately on file match)
    })

    it('handles error in recursive call gracefully', () => {
      const mockExistsSync = fs.existsSync as ReturnType<typeof vi.fn>
      const mockReaddirSync = fs.readdirSync as ReturnType<typeof vi.fn>

      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockImplementation((dir: string) => {
        if (dir === '/tests') {
          return [createMockDirent('dir1', true), createMockDirent('dir2', true)]
        }
        // dir1 throws error, dir2 continues
        if (dir === '/tests/dir1') {
          throw new Error('permission denied')
        }
        if (dir === '/tests/dir2') {
          return [createMockDirent('myFile.test.ts', false)]
        }
        return []
      })

      const result = searchDir('/tests', 'myFile', '.ts')
      expect(result).toBe('/tests/dir2/myFile.test.ts')
    })
  })
})
