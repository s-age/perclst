import { vi, describe, it, expect, beforeEach } from 'vitest'
import * as fs from 'fs'
import type { Dirent } from 'fs'
import { searchDir } from '../testFileDiscovery'

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
