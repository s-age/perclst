import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@src/infrastructures/fs', () => ({
  fileExists: vi.fn(),
  readText: vi.fn()
}))

import { fileExists, readText } from '@src/infrastructures/fs'
import { loadProcedure, procedureExists, ProcedureRepository } from '@src/repositories/procedures'
import { ProcedureNotFoundError } from '@src/errors/procedureNotFoundError'

const mockFileExists = vi.mocked(fileExists)
const mockReadText = vi.mocked(readText)

describe('loadProcedure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns local file content when workingDir is given and local file exists', () => {
    mockFileExists.mockReturnValue(true)
    mockReadText.mockReturnValue('local content')

    const result = loadProcedure('my-proc', '/work')

    expect(result).toBe('local content')
  })

  it('reads from the local path when workingDir is given and local file exists', () => {
    mockFileExists.mockReturnValue(true)
    mockReadText.mockReturnValue('local content')

    loadProcedure('my-proc', '/work')

    expect(mockReadText).toHaveBeenCalledWith('/work/procedures/my-proc.md')
  })

  it('returns package file content when workingDir is given but local file does not exist', () => {
    mockFileExists.mockReturnValueOnce(false).mockReturnValueOnce(true)
    mockReadText.mockReturnValue('package content')

    const result = loadProcedure('my-proc', '/work')

    expect(result).toBe('package content')
  })

  it('does not read the local path when local file does not exist', () => {
    mockFileExists.mockReturnValueOnce(false).mockReturnValueOnce(true)
    mockReadText.mockReturnValue('package content')

    loadProcedure('my-proc', '/work')

    expect(mockReadText).not.toHaveBeenCalledWith('/work/procedures/my-proc.md')
  })

  it('returns package file content when no workingDir is given', () => {
    mockFileExists.mockReturnValue(true)
    mockReadText.mockReturnValue('package content')

    const result = loadProcedure('my-proc')

    expect(result).toBe('package content')
  })

  it('skips the local path check when no workingDir is given', () => {
    mockFileExists.mockReturnValue(true)
    mockReadText.mockReturnValue('package content')

    loadProcedure('my-proc')

    expect(mockFileExists).toHaveBeenCalledTimes(1)
  })

  it('throws ProcedureNotFoundError when package file does not exist', () => {
    mockFileExists.mockReturnValue(false)

    expect(() => loadProcedure('missing-proc')).toThrow(ProcedureNotFoundError)
  })

  it('includes the procedure name in the thrown error message', () => {
    mockFileExists.mockReturnValue(false)

    expect(() => loadProcedure('missing-proc')).toThrow('missing-proc')
  })
})

describe('procedureExists', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns true when workingDir is given and local file exists', () => {
    mockFileExists.mockReturnValue(true)

    const result = procedureExists('my-proc', '/work')

    expect(result).toBe(true)
  })

  it('checks local path before package path when workingDir is given', () => {
    mockFileExists.mockReturnValue(true)

    procedureExists('my-proc', '/work')

    expect(mockFileExists).toHaveBeenNthCalledWith(1, '/work/procedures/my-proc.md')
  })

  it('returns true when local file is missing but package file exists', () => {
    mockFileExists.mockReturnValueOnce(false).mockReturnValueOnce(true)

    const result = procedureExists('my-proc', '/work')

    expect(result).toBe(true)
  })

  it('returns false when workingDir is given but neither local nor package file exists', () => {
    mockFileExists.mockReturnValue(false)

    const result = procedureExists('my-proc', '/work')

    expect(result).toBe(false)
  })

  it('returns false when no workingDir and package file does not exist', () => {
    mockFileExists.mockReturnValue(false)

    const result = procedureExists('my-proc')

    expect(result).toBe(false)
  })

  it('skips the local path check when no workingDir is given', () => {
    mockFileExists.mockReturnValue(false)

    procedureExists('my-proc')

    expect(mockFileExists).toHaveBeenCalledTimes(1)
  })
})

describe('ProcedureRepository', () => {
  let repo: ProcedureRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new ProcedureRepository()
  })

  describe('load', () => {
    it('returns procedure content by delegating to loadProcedure', () => {
      mockFileExists.mockReturnValue(true)
      mockReadText.mockReturnValue('delegated content')

      const result = repo.load('my-proc', '/work')

      expect(result).toBe('delegated content')
    })
  })

  describe('exists', () => {
    it('returns true when the procedure file exists', () => {
      mockFileExists.mockReturnValue(true)

      const result = repo.exists('my-proc', '/work')

      expect(result).toBe(true)
    })
  })
})
