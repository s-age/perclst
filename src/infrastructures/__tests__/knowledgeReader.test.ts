import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Stats } from 'fs'

const { mockExistsSync, mockReaddirSync, mockStatSync, mockReadFileSync, mockJoin } = vi.hoisted(
  () => ({
    mockExistsSync: vi.fn(),
    mockReaddirSync: vi.fn(),
    mockStatSync: vi.fn(),
    mockReadFileSync: vi.fn(),
    mockJoin: vi.fn()
  })
)

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  readdirSync: mockReaddirSync,
  statSync: mockStatSync,
  readFileSync: mockReadFileSync
}))

vi.mock('path', () => ({
  join: mockJoin
}))

import { listFilesRecursive, readTextFile } from '../knowledgeReader'

describe('knowledgeReader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock implementations for all tests
    mockJoin.mockImplementation((...parts: string[]) => parts.join('/'))
  })

  describe('listFilesRecursive', () => {
    it('returns empty array when directory does not exist', () => {
      mockExistsSync.mockReturnValue(false)

      const result = listFilesRecursive('/nonexistent/dir')

      expect(result).toEqual([])
      expect(mockExistsSync).toHaveBeenCalledWith('/nonexistent/dir')
    })

    it('returns empty array when directory is empty', () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue([])
      const mockStats: Partial<Stats> = { isDirectory: () => false }
      mockStatSync.mockReturnValue(mockStats)

      const result = listFilesRecursive('/empty/dir')

      expect(result).toEqual([])
      expect(mockReaddirSync).toHaveBeenCalledWith('/empty/dir')
    })

    it('returns all files when no ext filter is given', () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue(['file1.md', 'file2.txt'])
      const mockStats: Partial<Stats> = { isDirectory: () => false }
      mockStatSync.mockReturnValue(mockStats)

      const result = listFilesRecursive('/docs')

      expect(result).toEqual(['/docs/file1.md', '/docs/file2.txt'])
      expect(mockReaddirSync).toHaveBeenCalledWith('/docs')
    })

    it('returns only matching files when ext filter is given', () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue(['file1.md', 'file2.md'])
      const mockStats: Partial<Stats> = { isDirectory: () => false }
      mockStatSync.mockReturnValue(mockStats)

      const result = listFilesRecursive('/docs', '.md')

      expect(result).toEqual(['/docs/file1.md', '/docs/file2.md'])
      expect(mockReaddirSync).toHaveBeenCalledWith('/docs')
    })

    it('filters out non-matching files when ext is provided', () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue(['readme.md', 'package.json', 'guide.md', 'index.js'])
      const mockStats: Partial<Stats> = { isDirectory: () => false }
      mockStatSync.mockReturnValue(mockStats)

      const result = listFilesRecursive('/root', '.md')

      expect(result).toEqual(['/root/readme.md', '/root/guide.md'])
      expect(result).not.toContain('/root/package.json')
      expect(result).not.toContain('/root/index.js')
    })

    it('finds files recursively in nested subdirectories', () => {
      mockExistsSync.mockReturnValue(true)

      // Mock readdirSync to return different values for different directories
      mockReaddirSync.mockImplementation((dir: string | Buffer) => {
        const dirStr = typeof dir === 'string' ? dir : dir.toString()
        if (dirStr === '/root') {
          return ['file1.md', 'subdir', 'skip.txt']
        } else if (dirStr === '/root/subdir') {
          return ['file2.md', 'other.log']
        }
        return []
      })

      // Mock statSync to identify directories
      mockStatSync.mockImplementation((path: string | Buffer) => {
        const pathStr = typeof path === 'string' ? path : path.toString()
        return {
          isDirectory: () => pathStr === '/root/subdir'
        } as Partial<Stats>
      })

      const result = listFilesRecursive('/root', '.md')

      expect(result).toEqual(['/root/file1.md', '/root/subdir/file2.md'])
      expect(mockReaddirSync).toHaveBeenCalledWith('/root')
      expect(mockReaddirSync).toHaveBeenCalledWith('/root/subdir')
    })

    it('skips entries with non-matching extensions when ext is provided', () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue(['readme.md', 'src', 'package.json', 'changelog.md'])
      const mockStats: Partial<Stats> = { isDirectory: () => false }
      mockStatSync.mockReturnValue(mockStats)

      const result = listFilesRecursive('/root', '.md')

      expect(result).toEqual(['/root/readme.md', '/root/changelog.md'])
      expect(result).not.toContain('/root/src')
      expect(result).not.toContain('/root/package.json')
    })
  })

  describe('readTextFile', () => {
    it('reads file content with utf-8 encoding', () => {
      const fileContent = 'This is the file content\nWith multiple lines'
      mockReadFileSync.mockReturnValue(fileContent)

      const result = readTextFile('/path/to/file.txt')

      expect(result).toBe(fileContent)
      expect(mockReadFileSync).toHaveBeenCalledWith('/path/to/file.txt', 'utf-8')
    })

    it('reads empty file', () => {
      mockReadFileSync.mockReturnValue('')

      const result = readTextFile('/empty/file.txt')

      expect(result).toBe('')
      expect(mockReadFileSync).toHaveBeenCalledWith('/empty/file.txt', 'utf-8')
    })
  })
})
