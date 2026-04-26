import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ProcedureRepository } from '@src/repositories/procedures'
import { ProcedureNotFoundError } from '@src/errors/procedureNotFoundError'
import type { FsInfra } from '@src/infrastructures/fs'

type ProcedureFs = Pick<FsInfra, 'fileExists' | 'readText'>

describe('ProcedureRepository', () => {
  let repo: ProcedureRepository
  let mockFs: ProcedureFs

  beforeEach(() => {
    vi.clearAllMocks()
    mockFs = {
      fileExists: vi.fn(),
      readText: vi.fn()
    } as unknown as ProcedureFs
    repo = new ProcedureRepository(mockFs)
  })

  describe('load', () => {
    it('returns local file content when workingDir is given and local file exists', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue('local content')

      const result = repo.load('my-proc', '/work')

      expect(result).toBe('local content')
    })

    it('reads from the local path when workingDir is given and local file exists', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue('local content')

      repo.load('my-proc', '/work')

      expect(mockFs.readText).toHaveBeenCalledWith('/work/procedures/my-proc.md')
    })

    it('returns package file content when workingDir is given but local file does not exist', () => {
      vi.mocked(mockFs.fileExists).mockReturnValueOnce(false).mockReturnValueOnce(true)
      vi.mocked(mockFs.readText).mockReturnValue('package content')

      const result = repo.load('my-proc', '/work')

      expect(result).toBe('package content')
    })

    it('does not read the local path when local file does not exist', () => {
      vi.mocked(mockFs.fileExists).mockReturnValueOnce(false).mockReturnValueOnce(true)
      vi.mocked(mockFs.readText).mockReturnValue('package content')

      repo.load('my-proc', '/work')

      expect(mockFs.readText).not.toHaveBeenCalledWith('/work/procedures/my-proc.md')
    })

    it('returns package file content when no workingDir is given', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue('package content')

      const result = repo.load('my-proc')

      expect(result).toBe('package content')
    })

    it('skips the local path check when no workingDir is given', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue('package content')

      repo.load('my-proc')

      expect(mockFs.fileExists).toHaveBeenCalledTimes(1)
    })

    it('throws ProcedureNotFoundError when package file does not exist', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(false)

      expect(() => repo.load('missing-proc')).toThrow(ProcedureNotFoundError)
    })

    it('includes the procedure name in the thrown error message', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(false)

      expect(() => repo.load('missing-proc')).toThrow('missing-proc')
    })
  })

  describe('exists', () => {
    it('returns true when workingDir is given and local file exists', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)

      const result = repo.exists('my-proc', '/work')

      expect(result).toBe(true)
    })

    it('checks local path before package path when workingDir is given', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(true)

      repo.exists('my-proc', '/work')

      expect(mockFs.fileExists).toHaveBeenNthCalledWith(1, '/work/procedures/my-proc.md')
    })

    it('returns true when local file is missing but package file exists', () => {
      vi.mocked(mockFs.fileExists).mockReturnValueOnce(false).mockReturnValueOnce(true)

      const result = repo.exists('my-proc', '/work')

      expect(result).toBe(true)
    })

    it('returns false when workingDir is given but neither local nor package file exists', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(false)

      const result = repo.exists('my-proc', '/work')

      expect(result).toBe(false)
    })

    it('returns false when no workingDir and package file does not exist', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(false)

      const result = repo.exists('my-proc')

      expect(result).toBe(false)
    })

    it('skips the local path check when no workingDir is given', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(false)

      repo.exists('my-proc')

      expect(mockFs.fileExists).toHaveBeenCalledTimes(1)
    })
  })
})
