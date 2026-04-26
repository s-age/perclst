import { vi, describe, it, expect, beforeEach } from 'vitest'

const { mockResolve } = vi.hoisted(() => ({ mockResolve: vi.fn() }))

vi.mock('path', () => ({ resolve: mockResolve }))

import { RejectionFeedbackRepository } from '../rejectionFeedback'
import type { FsInfra } from '@src/infrastructures/fs'

type RejectionFs = Pick<FsInfra, 'fileExists' | 'readText' | 'removeFile' | 'currentWorkingDir'>

describe('RejectionFeedbackRepository', () => {
  let repo: RejectionFeedbackRepository
  let mockFs: RejectionFs

  beforeEach(() => {
    vi.clearAllMocks()
    mockFs = {
      fileExists: vi.fn(),
      readText: vi.fn(),
      removeFile: vi.fn(),
      currentWorkingDir: vi.fn()
    } as unknown as RejectionFs
    repo = new RejectionFeedbackRepository(mockFs)
  })

  describe('getFeedback', () => {
    it('returns feedback content when the tmp file exists', async () => {
      mockResolve.mockReturnValue('/proj/.claude/tmp/task1')
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue('some feedback')
      vi.mocked(mockFs.removeFile).mockResolvedValue(undefined)

      const result = await repo.getFeedback('task1')

      expect(result).toBe('some feedback')
    })

    it('returns undefined when the tmp file does not exist', async () => {
      mockResolve.mockReturnValue('/proj/.claude/tmp/task1')
      vi.mocked(mockFs.fileExists).mockReturnValue(false)

      const result = await repo.getFeedback('task1')

      expect(result).toBeUndefined()
    })

    it('removes the tmp file after reading when the file exists', async () => {
      const resolvedPath = '/proj/.claude/tmp/task1'
      mockResolve.mockReturnValue(resolvedPath)
      vi.mocked(mockFs.fileExists).mockReturnValue(true)
      vi.mocked(mockFs.readText).mockReturnValue('feedback')
      vi.mocked(mockFs.removeFile).mockResolvedValue(undefined)

      await repo.getFeedback('task1')

      expect(mockFs.removeFile).toHaveBeenCalledWith(resolvedPath)
    })

    it('does not remove the tmp file when the file does not exist', async () => {
      mockResolve.mockReturnValue('/proj/.claude/tmp/task1')
      vi.mocked(mockFs.fileExists).mockReturnValue(false)

      await repo.getFeedback('task1')

      expect(mockFs.removeFile).not.toHaveBeenCalled()
    })

    it('resolves the path from the taskName', async () => {
      mockResolve.mockReturnValue('/proj/.claude/tmp/my-task')
      vi.mocked(mockFs.fileExists).mockReturnValue(false)

      await repo.getFeedback('my-task')

      expect(mockResolve).toHaveBeenCalledWith('.claude/tmp/my-task')
    })
  })

  describe('getCwd', () => {
    it('returns the current working directory from the infrastructure', () => {
      vi.mocked(mockFs.currentWorkingDir).mockReturnValue('/home/user/project')

      const result = repo.getCwd()

      expect(result).toBe('/home/user/project')
    })
  })
})
