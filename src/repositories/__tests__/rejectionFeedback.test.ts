import { vi, describe, it, expect, beforeEach } from 'vitest'

const { mockResolve, mockFileExists, mockReadText, mockRemoveFile, mockCurrentWorkingDir } =
  vi.hoisted(() => ({
    mockResolve: vi.fn(),
    mockFileExists: vi.fn(),
    mockReadText: vi.fn(),
    mockRemoveFile: vi.fn(),
    mockCurrentWorkingDir: vi.fn()
  }))

vi.mock('path', () => ({
  resolve: mockResolve
}))

vi.mock('@src/infrastructures/fs', () => ({
  fileExists: mockFileExists,
  readText: mockReadText,
  removeFile: mockRemoveFile,
  currentWorkingDir: mockCurrentWorkingDir
}))

import { getRejectionFeedback, getCwd, RejectionFeedbackRepository } from '../rejectionFeedback'

describe('getRejectionFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns feedback content when the tmp file exists', async () => {
    mockResolve.mockReturnValue('/proj/.claude/tmp/task1')
    mockFileExists.mockReturnValue(true)
    mockReadText.mockReturnValue('some feedback')
    mockRemoveFile.mockResolvedValue(undefined)

    const result = await getRejectionFeedback('task1')

    expect(result).toBe('some feedback')
  })

  it('returns undefined when the tmp file does not exist', async () => {
    mockResolve.mockReturnValue('/proj/.claude/tmp/task1')
    mockFileExists.mockReturnValue(false)

    const result = await getRejectionFeedback('task1')

    expect(result).toBeUndefined()
  })

  it('removes the tmp file after reading when the file exists', async () => {
    const resolvedPath = '/proj/.claude/tmp/task1'
    mockResolve.mockReturnValue(resolvedPath)
    mockFileExists.mockReturnValue(true)
    mockReadText.mockReturnValue('feedback')
    mockRemoveFile.mockResolvedValue(undefined)

    await getRejectionFeedback('task1')

    expect(mockRemoveFile).toHaveBeenCalledWith(resolvedPath)
  })

  it('does not remove the tmp file when the file does not exist', async () => {
    mockResolve.mockReturnValue('/proj/.claude/tmp/task1')
    mockFileExists.mockReturnValue(false)

    await getRejectionFeedback('task1')

    expect(mockRemoveFile).not.toHaveBeenCalled()
  })

  it('resolves the path from the taskName', async () => {
    mockResolve.mockReturnValue('/proj/.claude/tmp/my-task')
    mockFileExists.mockReturnValue(false)

    await getRejectionFeedback('my-task')

    expect(mockResolve).toHaveBeenCalledWith('.claude/tmp/my-task')
  })
})

describe('getCwd', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the current working directory from the infrastructure', () => {
    mockCurrentWorkingDir.mockReturnValue('/home/user/project')

    const result = getCwd()

    expect(result).toBe('/home/user/project')
  })
})

describe('RejectionFeedbackRepository', () => {
  let repo: RejectionFeedbackRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new RejectionFeedbackRepository()
  })

  describe('getFeedback', () => {
    it('returns feedback content when the tmp file exists', async () => {
      mockResolve.mockReturnValue('/proj/.claude/tmp/my-task')
      mockFileExists.mockReturnValue(true)
      mockReadText.mockReturnValue('task feedback')
      mockRemoveFile.mockResolvedValue(undefined)

      const result = await repo.getFeedback('my-task')

      expect(result).toBe('task feedback')
    })

    it('returns undefined when the tmp file does not exist', async () => {
      mockResolve.mockReturnValue('/proj/.claude/tmp/my-task')
      mockFileExists.mockReturnValue(false)

      const result = await repo.getFeedback('my-task')

      expect(result).toBeUndefined()
    })
  })

  describe('getCwd', () => {
    it('returns the current working directory from the infrastructure', () => {
      mockCurrentWorkingDir.mockReturnValue('/home/user/project')

      const result = repo.getCwd()

      expect(result).toBe('/home/user/project')
    })
  })
})
