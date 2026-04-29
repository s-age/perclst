import { vi, describe, it, expect, beforeEach } from 'vitest'
import * as fsSync from 'fs'
import * as fsPromises from 'fs/promises'
import * as os from 'os'
import { FsInfra } from '../fs'

// Mock fs and os modules
vi.mock('fs')
vi.mock('fs/promises')
vi.mock('os')

describe('FsInfra', () => {
  let infra: FsInfra

  beforeEach(() => {
    vi.resetAllMocks()
    infra = new FsInfra()
  })

  describe('fileExists', () => {
    it('should return true when file exists', () => {
      vi.mocked(fsSync.existsSync).mockReturnValue(true)

      const result = infra.fileExists('/path/to/file.json')

      expect(result).toBe(true)
      expect(fsSync.existsSync).toHaveBeenCalledWith('/path/to/file.json')
    })

    it('should return false when file does not exist', () => {
      vi.mocked(fsSync.existsSync).mockReturnValue(false)

      const result = infra.fileExists('/nonexistent/file.json')

      expect(result).toBe(false)
    })
  })

  describe('removeFile', () => {
    it('should delete file asynchronously', async () => {
      vi.mocked(fsPromises.unlink).mockResolvedValue(undefined)

      await infra.removeFile('/path/to/file.json')

      expect(fsPromises.unlink).toHaveBeenCalledWith('/path/to/file.json')
    })

    it('should reject when file does not exist', async () => {
      vi.mocked(fsPromises.unlink).mockRejectedValue(new Error('ENOENT: no such file or directory'))

      await expect(infra.removeFile('/nonexistent.json')).rejects.toThrow('ENOENT')
    })

    it('should reject when permission denied', async () => {
      vi.mocked(fsPromises.unlink).mockRejectedValue(new Error('EACCES: permission denied'))

      await expect(infra.removeFile('/restricted/file.json')).rejects.toThrow('permission denied')
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
      ] as unknown as ReturnType<typeof fsSync.readdirSync>)

      const result = infra.listFiles('/path/to/dir', '.json')

      expect(result).toEqual(['file1.json', 'file2.json', 'file4.json'])
      expect(fsSync.existsSync).toHaveBeenCalledWith('/path/to/dir')
      expect(fsSync.readdirSync).toHaveBeenCalledWith('/path/to/dir')
    })

    it('should return empty array when directory does not exist', () => {
      vi.mocked(fsSync.existsSync).mockReturnValue(false)

      const result = infra.listFiles('/nonexistent/dir', '.json')

      expect(result).toEqual([])
      expect(fsSync.readdirSync).not.toHaveBeenCalled()
    })

    it('should return empty array when no files match extension', () => {
      vi.mocked(fsSync.existsSync).mockReturnValue(true)
      vi.mocked(fsSync.readdirSync).mockReturnValue([
        'file1.txt',
        'file2.txt'
      ] as unknown as ReturnType<typeof fsSync.readdirSync>)

      const result = infra.listFiles('/path/to/dir', '.json')

      expect(result).toEqual([])
    })

    it('should return all files when directory is empty', () => {
      vi.mocked(fsSync.existsSync).mockReturnValue(true)
      vi.mocked(fsSync.readdirSync).mockReturnValue(
        [] as unknown as ReturnType<typeof fsSync.readdirSync>
      )

      const result = infra.listFiles('/path/to/dir', '.json')

      expect(result).toEqual([])
    })
  })

  describe('ensureDir', () => {
    it('should create directory with recursive option', () => {
      infra.ensureDir('/path/to/dir')

      expect(fsSync.mkdirSync).toHaveBeenCalledWith('/path/to/dir', { recursive: true })
    })

    it('should not throw error when directory already exists', () => {
      vi.mocked(fsSync.mkdirSync).mockImplementation(() => {
        // mkdirSync with recursive: true doesn't throw if dir exists
        return ''
      })

      expect(() => infra.ensureDir('/existing/dir')).not.toThrow()
    })

    it('should throw error when permission denied', () => {
      vi.mocked(fsSync.mkdirSync).mockImplementation(() => {
        throw new Error('EACCES: permission denied')
      })

      expect(() => infra.ensureDir('/restricted/dir')).toThrow('permission denied')
    })
  })

  describe('readText', () => {
    it('should read and return file contents as string', () => {
      const mockContent = 'Hello, World!'
      vi.mocked(fsSync.readFileSync).mockReturnValue(mockContent)

      const result = infra.readText('/path/to/file.txt')

      expect(result).toBe(mockContent)
      expect(fsSync.readFileSync).toHaveBeenCalledWith('/path/to/file.txt', 'utf-8')
    })

    it('should preserve whitespace and newlines', () => {
      const mockContent = 'Line 1\nLine 2\n  indented'
      vi.mocked(fsSync.readFileSync).mockReturnValue(mockContent)

      const result = infra.readText('/path/to/file.txt')

      expect(result).toBe(mockContent)
    })

    it('should throw error when file does not exist', () => {
      vi.mocked(fsSync.readFileSync).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory')
      })

      expect(() => infra.readText('/nonexistent.txt')).toThrow('ENOENT')
    })
  })

  describe('writeText', () => {
    it('should write content to file with utf-8 encoding', () => {
      infra.writeText('/path/to/file.txt', 'hello world')

      expect(fsSync.writeFileSync).toHaveBeenCalledWith('/path/to/file.txt', 'hello world', 'utf-8')
    })

    it('should write empty string content', () => {
      infra.writeText('/path/to/file.txt', '')

      expect(fsSync.writeFileSync).toHaveBeenCalledWith('/path/to/file.txt', '', 'utf-8')
    })

    it('should throw when writeFileSync throws', () => {
      vi.mocked(fsSync.writeFileSync).mockImplementation(() => {
        throw new Error('EACCES: permission denied')
      })

      expect(() => infra.writeText('/restricted/file.txt', 'content')).toThrow()
    })
  })

  describe('removeFileSync', () => {
    it('should call unlinkSync with the given path', () => {
      infra.removeFileSync('/path/to/file.txt')

      expect(fsSync.unlinkSync).toHaveBeenCalledWith('/path/to/file.txt')
    })

    it('should throw when the file does not exist', () => {
      vi.mocked(fsSync.unlinkSync).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory')
      })

      expect(() => infra.removeFileSync('/nonexistent.txt')).toThrow('ENOENT')
    })

    it('should throw when permission is denied', () => {
      vi.mocked(fsSync.unlinkSync).mockImplementation(() => {
        throw new Error('EACCES: permission denied')
      })

      expect(() => infra.removeFileSync('/restricted/file.txt')).toThrow('permission denied')
    })
  })

  describe('listDirEntries', () => {
    it('should return Dirent entries from the directory', (): void => {
      const entry = { isFile: (): boolean => true, name: 'file.txt' }
      vi.mocked(fsSync.readdirSync).mockReturnValue([entry] as unknown as ReturnType<
        typeof fsSync.readdirSync
      >)

      const result = infra.listDirEntries('/some/dir')

      expect(result).toEqual([entry])
      expect(fsSync.readdirSync).toHaveBeenCalledWith('/some/dir', { withFileTypes: true })
    })

    it('should return empty array when directory is empty', () => {
      vi.mocked(fsSync.readdirSync).mockReturnValue(
        [] as unknown as ReturnType<typeof fsSync.readdirSync>
      )

      const result = infra.listDirEntries('/empty/dir')

      expect(result).toEqual([])
    })

    it('should throw when directory does not exist', () => {
      vi.mocked(fsSync.readdirSync).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory')
      })

      expect(() => infra.listDirEntries('/nonexistent')).toThrow('ENOENT')
    })
  })

  describe('isDirectory', () => {
    it('should return true when path is a directory', () => {
      vi.mocked(fsSync.statSync).mockReturnValue({ isDirectory: () => true } as ReturnType<
        typeof fsSync.statSync
      >)

      const result = infra.isDirectory('/some/dir')

      expect(result).toBe(true)
    })

    it('should return false when path is a file', () => {
      vi.mocked(fsSync.statSync).mockReturnValue({ isDirectory: () => false } as ReturnType<
        typeof fsSync.statSync
      >)

      const result = infra.isDirectory('/some/file.txt')

      expect(result).toBe(false)
    })

    it('should throw when statSync throws', () => {
      vi.mocked(fsSync.statSync).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory')
      })

      expect(() => infra.isDirectory('/nonexistent')).toThrow()
    })
  })

  describe('homeDir', () => {
    it('should return home directory path', () => {
      vi.mocked(os.homedir).mockReturnValue('/home/testuser')

      const result = infra.homeDir()

      expect(result).toBe('/home/testuser')
      expect(os.homedir).toHaveBeenCalled()
    })

    it('should call os.homedir exactly once', () => {
      vi.mocked(os.homedir).mockReturnValue('/home/testuser')

      infra.homeDir()

      expect(os.homedir).toHaveBeenCalledTimes(1)
    })
  })

  describe('currentWorkingDir', () => {
    it('should return the current working directory', () => {
      vi.spyOn(process, 'cwd').mockReturnValue('/mocked/cwd')

      expect(infra.currentWorkingDir()).toBe('/mocked/cwd')
      expect(process.cwd).toHaveBeenCalled()
    })
  })
})
