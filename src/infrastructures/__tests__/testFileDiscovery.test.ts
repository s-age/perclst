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
    // -----------------------------------------------------------------------
    // Happy path
    // -----------------------------------------------------------------------

    it('finds .test file in flat directory', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      ;(fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([
        createMockDirent('myFile.test.ts', false)
      ])

      const result = searchDir('/tests', 'myFile', '.ts')
      expect(result).toBe('/tests/myFile.test.ts')
    })

    it('finds .spec file in flat directory', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      ;(fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([
        createMockDirent('myFile.spec.ts', false)
      ])

      const result = searchDir('/tests', 'myFile', '.ts')
      expect(result).toBe('/tests/myFile.spec.ts')
    })

    it('finds file in nested subdirectory via recursion', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      ;(fs.readdirSync as ReturnType<typeof vi.fn>).mockImplementation((dir: string) => {
        if (dir === '/tests') return [createMockDirent('unit', true)]
        if (dir === '/tests/unit') return [createMockDirent('myFile.test.ts', false)]
        return []
      })

      const result = searchDir('/tests', 'myFile', '.ts')
      expect(result).toBe('/tests/unit/myFile.test.ts')
    })

    it('searches multiple levels of nested directories', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      ;(fs.readdirSync as ReturnType<typeof vi.fn>).mockImplementation((dir: string) => {
        if (dir === '/tests') return [createMockDirent('level1', true)]
        if (dir === '/tests/level1') return [createMockDirent('level2', true)]
        if (dir === '/tests/level1/level2') return [createMockDirent('myFile.spec.ts', false)]
        return []
      })

      const result = searchDir('/tests', 'myFile', '.ts')
      expect(result).toBe('/tests/level1/level2/myFile.spec.ts')
    })

    it('prefers .test file over .spec file when both exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      ;(fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([
        createMockDirent('myFile.test.ts', false),
        createMockDirent('myFile.spec.ts', false)
      ])

      const result = searchDir('/tests', 'myFile', '.ts')
      expect(result).toBe('/tests/myFile.test.ts')
    })

    it('continues recursion past non-matching file entries to find match in subdir', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      ;(fs.readdirSync as ReturnType<typeof vi.fn>).mockImplementation((dir: string) => {
        if (dir === '/tests') {
          return [
            createMockDirent('README.md', false),
            createMockDirent('nested', true),
            createMockDirent('helpers.ts', false)
          ]
        }
        if (dir === '/tests/nested') return [createMockDirent('myFile.test.ts', false)]
        return []
      })

      const result = searchDir('/tests', 'myFile', '.ts')
      expect(result).toBe('/tests/nested/myFile.test.ts')
    })

    it('stops after first match and does not recurse into subsequent entries', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      ;(fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([
        createMockDirent('myFile.test.ts', false),
        createMockDirent('other', true)
      ])

      const result = searchDir('/tests', 'myFile', '.ts')
      expect(result).toBe('/tests/myFile.test.ts')
      expect(fs.readdirSync).toHaveBeenCalledTimes(1)
    })

    it('does not match file with different extension', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      ;(fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([
        createMockDirent('myFile.test.js', false),
        createMockDirent('myFile.test.ts', false)
      ])

      const result = searchDir('/tests', 'myFile', '.ts')
      expect(result).toBe('/tests/myFile.test.ts')
    })

    it('continues searching sibling directories after one subdirectory yields no match', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      ;(fs.readdirSync as ReturnType<typeof vi.fn>).mockImplementation((dir: string) => {
        if (dir === '/tests') {
          return [createMockDirent('dir1', true), createMockDirent('dir2', true)]
        }
        if (dir === '/tests/dir1') return [createMockDirent('unrelated.ts', false)]
        if (dir === '/tests/dir2') return [createMockDirent('myFile.test.ts', false)]
        return []
      })

      const result = searchDir('/tests', 'myFile', '.ts')
      expect(result).toBe('/tests/dir2/myFile.test.ts')
    })

    // -----------------------------------------------------------------------
    // Branch: null / not-found paths
    // -----------------------------------------------------------------------

    it('returns null when directory does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const result = searchDir('/nonexistent/dir', 'myFile', '.ts')
      expect(result).toBeNull()
    })

    it('returns null when directory is empty', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      ;(fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([])

      const result = searchDir('/tests', 'myFile', '.ts')
      expect(result).toBeNull()
    })

    it('returns null when directory has no matching files', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      ;(fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([
        createMockDirent('otherFile.ts', false),
        createMockDirent('helpers.ts', false)
      ])

      const result = searchDir('/tests', 'myFile', '.ts')
      expect(result).toBeNull()
    })

    it('returns null when all nested subdirectories contain no matching files', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      ;(fs.readdirSync as ReturnType<typeof vi.fn>).mockImplementation((dir: string) => {
        if (dir === '/tests') return [createMockDirent('subdir', true)]
        if (dir === '/tests/subdir') return [createMockDirent('unrelated.ts', false)]
        return []
      })

      const result = searchDir('/tests', 'myFile', '.ts')
      expect(result).toBeNull()
    })

    // -----------------------------------------------------------------------
    // Error paths
    // -----------------------------------------------------------------------

    it('returns null and suppresses readdirSync permission error', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      ;(fs.readdirSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('EACCES: permission denied')
      })

      const result = searchDir('/restricted', 'myFile', '.ts')
      expect(result).toBeNull()
    })

    it('continues searching sibling directories after one subdirectory throws', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      ;(fs.readdirSync as ReturnType<typeof vi.fn>).mockImplementation((dir: string) => {
        if (dir === '/tests') {
          return [createMockDirent('dir1', true), createMockDirent('dir2', true)]
        }
        if (dir === '/tests/dir1') throw new Error('permission denied')
        if (dir === '/tests/dir2') return [createMockDirent('myFile.test.ts', false)]
        return []
      })

      const result = searchDir('/tests', 'myFile', '.ts')
      expect(result).toBe('/tests/dir2/myFile.test.ts')
    })
  })
})
