import { vi, describe, it, expect, beforeEach } from 'vitest'
import * as fsSync from 'fs'
import * as fsPromises from 'fs/promises'
import * as os from 'os'
import {
  readJson,
  writeJson,
  fileExists,
  removeFile,
  listFiles,
  ensureDir,
  readText,
  homeDir,
  currentWorkingDir
} from '../fs'

// Mock fs and os modules
vi.mock('fs')
vi.mock('fs/promises')
vi.mock('os')

describe('fs module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('readJson', () => {
    it('should parse and return JSON from file', () => {
      const mockData = { name: 'test', value: 42 }
      vi.mocked(fsSync.readFileSync).mockReturnValue(JSON.stringify(mockData))

      const result = readJson<typeof mockData>('/path/to/file.json')

      expect(result).toEqual(mockData)
      expect(fsSync.readFileSync).toHaveBeenCalledWith('/path/to/file.json', 'utf-8')
    })

    it('should throw error when file contains invalid JSON', () => {
      vi.mocked(fsSync.readFileSync).mockReturnValue('invalid json {')

      expect(() => readJson('/path/to/file.json')).toThrow(SyntaxError)
    })

    it('should throw error when file does not exist', () => {
      vi.mocked(fsSync.readFileSync).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory')
      })

      expect(() => readJson('/nonexistent.json')).toThrow()
    })
  })

  describe('writeJson', () => {
    it('should write data as formatted JSON to file', () => {
      const mockData = { name: 'test', nested: { value: 42 } }

      writeJson('/path/to/file.json', mockData)

      expect(fsSync.writeFileSync).toHaveBeenCalledWith(
        '/path/to/file.json',
        JSON.stringify(mockData, null, 2),
        'utf-8'
      )
    })

    it('should format JSON with 2-space indentation', () => {
      const mockData = { a: 1 }

      writeJson('/path/to/file.json', mockData)

      const writtenContent = vi.mocked(fsSync.writeFileSync).mock.calls[0][1]
      expect(writtenContent).toContain('\n')
    })

    it('should throw error when write fails', () => {
      vi.mocked(fsSync.writeFileSync).mockImplementation(() => {
        throw new Error('EACCES: permission denied')
      })

      expect(() => writeJson('/restricted/file.json', {})).toThrow()
    })
  })

  describe('fileExists', () => {
    it('should return true when file exists', () => {
      vi.mocked(fsSync.existsSync).mockReturnValue(true)

      const result = fileExists('/path/to/file.json')

      expect(result).toBe(true)
      expect(fsSync.existsSync).toHaveBeenCalledWith('/path/to/file.json')
    })

    it('should return false when file does not exist', () => {
      vi.mocked(fsSync.existsSync).mockReturnValue(false)

      const result = fileExists('/nonexistent/file.json')

      expect(result).toBe(false)
    })
  })

  describe('removeFile', () => {
    it('should delete file asynchronously', async () => {
      vi.mocked(fsPromises.unlink).mockResolvedValue(undefined)

      await removeFile('/path/to/file.json')

      expect(fsPromises.unlink).toHaveBeenCalledWith('/path/to/file.json')
    })

    it('should reject when file does not exist', async () => {
      vi.mocked(fsPromises.unlink).mockRejectedValue(new Error('ENOENT: no such file or directory'))

      await expect(removeFile('/nonexistent.json')).rejects.toThrow()
    })

    it('should reject when permission denied', async () => {
      vi.mocked(fsPromises.unlink).mockRejectedValue(new Error('EACCES: permission denied'))

      await expect(removeFile('/restricted/file.json')).rejects.toThrow('permission denied')
    })
  })

  describe('listFiles', () => {
    it('should return files matching extension when directory exists', () => {
      vi.mocked(fsSync.existsSync).mockReturnValue(true)
      vi.mocked(fsSync.readdirSync).mockReturnValue([
        'file1.json',
        'file2.json',
        'file3.txt',
        'file4.json'
      ] as unknown as string[])

      const result = listFiles('/path/to/dir', '.json')

      expect(result).toEqual(['file1.json', 'file2.json', 'file4.json'])
      expect(fsSync.existsSync).toHaveBeenCalledWith('/path/to/dir')
      expect(fsSync.readdirSync).toHaveBeenCalledWith('/path/to/dir')
    })

    it('should return empty array when directory does not exist', () => {
      vi.mocked(fsSync.existsSync).mockReturnValue(false)

      const result = listFiles('/nonexistent/dir', '.json')

      expect(result).toEqual([])
      expect(fsSync.readdirSync).not.toHaveBeenCalled()
    })

    it('should return empty array when no files match extension', () => {
      vi.mocked(fsSync.existsSync).mockReturnValue(true)
      vi.mocked(fsSync.readdirSync).mockReturnValue([
        'file1.txt',
        'file2.txt'
      ] as unknown as string[])

      const result = listFiles('/path/to/dir', '.json')

      expect(result).toEqual([])
    })

    it('should return all files when directory is empty', () => {
      vi.mocked(fsSync.existsSync).mockReturnValue(true)
      vi.mocked(fsSync.readdirSync).mockReturnValue([] as unknown as string[])

      const result = listFiles('/path/to/dir', '.json')

      expect(result).toEqual([])
    })
  })

  describe('ensureDir', () => {
    it('should create directory with recursive option', () => {
      ensureDir('/path/to/dir')

      expect(fsSync.mkdirSync).toHaveBeenCalledWith('/path/to/dir', { recursive: true })
    })

    it('should not throw error when directory already exists', () => {
      vi.mocked(fsSync.mkdirSync).mockImplementation(() => {
        // mkdirSync with recursive: true doesn't throw if dir exists
        return ''
      })

      expect(() => ensureDir('/existing/dir')).not.toThrow()
    })

    it('should throw error when permission denied', () => {
      vi.mocked(fsSync.mkdirSync).mockImplementation(() => {
        throw new Error('EACCES: permission denied')
      })

      expect(() => ensureDir('/restricted/dir')).toThrow('permission denied')
    })
  })

  describe('readText', () => {
    it('should read and return file contents as string', () => {
      const mockContent = 'Hello, World!'
      vi.mocked(fsSync.readFileSync).mockReturnValue(mockContent)

      const result = readText('/path/to/file.txt')

      expect(result).toBe(mockContent)
      expect(fsSync.readFileSync).toHaveBeenCalledWith('/path/to/file.txt', 'utf-8')
    })

    it('should preserve whitespace and newlines', () => {
      const mockContent = 'Line 1\nLine 2\n  indented'
      vi.mocked(fsSync.readFileSync).mockReturnValue(mockContent)

      const result = readText('/path/to/file.txt')

      expect(result).toBe(mockContent)
    })

    it('should throw error when file does not exist', () => {
      vi.mocked(fsSync.readFileSync).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory')
      })

      expect(() => readText('/nonexistent.txt')).toThrow()
    })
  })

  describe('homeDir', () => {
    it('should return home directory path', () => {
      vi.mocked(os.homedir).mockReturnValue('/home/testuser')

      const result = homeDir()

      expect(result).toBe('/home/testuser')
      expect(os.homedir).toHaveBeenCalled()
    })

    it('should return path with correct user', () => {
      vi.mocked(os.homedir).mockReturnValue('/Users/testuser')

      const result = homeDir()

      expect(result).toBe('/Users/testuser')
    })
  })

  describe('currentWorkingDir', () => {
    it('should return current working directory', () => {
      const originalCwd = process.cwd

      expect(currentWorkingDir()).toBe(originalCwd())
    })

    it('should return absolute path', () => {
      const result = currentWorkingDir()

      expect(result).toBe(process.cwd())
    })

    it('should return a string', () => {
      const result = currentWorkingDir()

      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })
  })
})
