import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { IPipelineFileRepository } from '@src/repositories/ports/fileMove'
import type { IGitRepository } from '@src/repositories/ports/git'
import type { Pipeline } from '@src/types/pipeline'
import { PipelineFileDomain } from '../pipelineFile'

// Mock path utilities
vi.mock('@src/utils/path', () => ({
  resolve: vi.fn(),
  dirname: vi.fn(),
  basename: vi.fn(),
  extname: vi.fn(),
  join: vi.fn()
}))

import { resolve, dirname, basename, extname, join } from '@src/utils/path'

describe('PipelineFileDomain', () => {
  let fileMoveRepo: IPipelineFileRepository
  let gitRepo: IGitRepository
  let domain: PipelineFileDomain

  beforeEach(() => {
    vi.clearAllMocks()

    fileMoveRepo = {
      moveToDone: vi.fn(),
      cleanDir: vi.fn(),
      readRaw: vi.fn(),
      write: vi.fn()
    } as unknown as IPipelineFileRepository

    gitRepo = {
      getDiffStat: vi.fn(),
      getHead: vi.fn(),
      getDiffSummary: vi.fn(),
      getDiff: vi.fn(),
      hasTrackedFiles: vi.fn().mockReturnValue(true),
      stageUpdated: vi.fn(),
      stageNew: vi.fn(),
      commit: vi.fn()
    } as unknown as IGitRepository

    domain = new PipelineFileDomain(fileMoveRepo, gitRepo)
  })

  describe('moveToDone', () => {
    it('should move pipeline to done directory and return relative path', () => {
      // Setup mocks - join is called twice: once for absolute dest, once for relative dest
      vi.mocked(resolve).mockReturnValue('/home/user/pipelines/task1.json')
      vi.mocked(dirname).mockReturnValue('/home/user/pipelines')
      vi.mocked(extname).mockReturnValue('.json')
      vi.mocked(basename).mockReturnValue('task1')
      vi.mocked(join)
        .mockReturnValueOnce('/home/user/pipelines/done/task1.json') // for dest
        .mockReturnValueOnce('done/task1.json') // for relativeDest

      // Execute
      const result = domain.moveToDone('/home/user/pipelines/task1.json')

      // Assert
      expect(result).toBe('done/task1.json')
      expect(resolve).toHaveBeenCalledWith('/home/user/pipelines/task1.json')
      expect(dirname).toHaveBeenCalledWith('/home/user/pipelines/task1.json')
      expect(extname).toHaveBeenCalledWith('/home/user/pipelines/task1.json')
      expect(basename).toHaveBeenCalledWith('/home/user/pipelines/task1.json', '.json')
    })

    it('should move yaml pipeline and preserve .yaml extension', () => {
      vi.mocked(resolve).mockReturnValue('/home/user/pipelines/task1.yaml')
      vi.mocked(dirname).mockReturnValue('/home/user/pipelines')
      vi.mocked(extname).mockReturnValue('.yaml')
      vi.mocked(basename).mockReturnValue('task1')
      vi.mocked(join)
        .mockReturnValueOnce('/home/user/pipelines/done/task1.yaml')
        .mockReturnValueOnce('done/task1.yaml')

      const result = domain.moveToDone('/home/user/pipelines/task1.yaml')

      expect(result).toBe('done/task1.yaml')
      expect(extname).toHaveBeenCalledWith('/home/user/pipelines/task1.yaml')
      expect(basename).toHaveBeenCalledWith('/home/user/pipelines/task1.yaml', '.yaml')
    })

    it('should move yml pipeline and preserve .yml extension', () => {
      vi.mocked(resolve).mockReturnValue('/home/user/pipelines/task1.yml')
      vi.mocked(dirname).mockReturnValue('/home/user/pipelines')
      vi.mocked(extname).mockReturnValue('.yml')
      vi.mocked(basename).mockReturnValue('task1')
      vi.mocked(join)
        .mockReturnValueOnce('/home/user/pipelines/done/task1.yml')
        .mockReturnValueOnce('done/task1.yml')

      const result = domain.moveToDone('/home/user/pipelines/task1.yml')

      expect(result).toBe('done/task1.yml')
      expect(extname).toHaveBeenCalledWith('/home/user/pipelines/task1.yml')
      expect(basename).toHaveBeenCalledWith('/home/user/pipelines/task1.yml', '.yml')
      expect(fileMoveRepo.moveToDone).toHaveBeenCalledWith(
        '/home/user/pipelines/task1.yml',
        '/home/user/pipelines/done/task1.yml'
      )
    })

    it('should handle nested segment structure in basename', () => {
      // Setup: filename is like "agent__subtask__final.json"
      vi.mocked(resolve).mockReturnValue('/home/user/pipelines/agent__subtask__final.json')
      vi.mocked(dirname).mockReturnValue('/home/user/pipelines')
      vi.mocked(extname).mockReturnValue('.json')
      vi.mocked(basename).mockReturnValue('agent__subtask__final')
      vi.mocked(join)
        .mockReturnValueOnce('/home/user/pipelines/done/agent/subtask/final.json') // for dest
        .mockReturnValueOnce('done/agent/subtask/final.json') // for relativeDest

      const result = domain.moveToDone('/home/user/pipelines/agent__subtask__final.json')

      expect(result).toBe('done/agent/subtask/final.json')
      expect(fileMoveRepo.moveToDone).toHaveBeenCalled()
    })

    it('should return null if directory already contains done in path', () => {
      // Setup: file is already in a done directory
      vi.mocked(resolve).mockReturnValue('/home/user/pipelines/done/task1.json')
      vi.mocked(dirname).mockReturnValue('/home/user/pipelines/done')

      const result = domain.moveToDone('/home/user/pipelines/done/task1.json')

      expect(result).toBeNull()
      expect(fileMoveRepo.moveToDone).not.toHaveBeenCalled()
    })

    it('should return null if done appears anywhere in directory path', () => {
      // Setup: file is in a deeply nested done directory
      vi.mocked(resolve).mockReturnValue('/home/user/done/work/pipelines/task1.json')
      vi.mocked(dirname).mockReturnValue('/home/user/done/work/pipelines')

      const result = domain.moveToDone('/home/user/done/work/pipelines/task1.json')

      expect(result).toBeNull()
      expect(fileMoveRepo.moveToDone).not.toHaveBeenCalled()
    })
  })

  describe('getDiffStat', () => {
    it('should return diff stat from git repository', () => {
      const expectedStat = 'file1.ts | 10 ++++++++++\nfile2.ts | 5 -----'
      vi.mocked(gitRepo.getDiffStat).mockReturnValue(expectedStat as string | null)

      const result = domain.getDiffStat()

      expect(result).toBe(expectedStat)
      expect(gitRepo.getDiffStat).toHaveBeenCalled()
    })

    it('should return null when git repo returns null', () => {
      vi.mocked(gitRepo.getDiffStat).mockReturnValue(null as string | null)

      const result = domain.getDiffStat()

      expect(result).toBeNull()
    })
  })

  describe('getHead', () => {
    it('should return current head commit hash from git repository', () => {
      const expectedHead = 'abc123def456'
      vi.mocked(gitRepo.getHead).mockReturnValue(expectedHead as string | null)

      const result = domain.getHead()

      expect(result).toBe(expectedHead)
      expect(gitRepo.getHead).toHaveBeenCalled()
    })

    it('should return null when not in a git repository', () => {
      vi.mocked(gitRepo.getHead).mockReturnValue(null as string | null)

      const result = domain.getHead()

      expect(result).toBeNull()
    })
  })

  describe('getDiffSummary', () => {
    it('should return diff summary between two commits', () => {
      const expectedSummary = '2 files changed, 15 insertions(+), 3 deletions(-)'
      vi.mocked(gitRepo.getDiffSummary).mockReturnValue(expectedSummary as string | null)

      const result = domain.getDiffSummary('abc123', 'def456')

      expect(result).toBe(expectedSummary)
      expect(gitRepo.getDiffSummary).toHaveBeenCalledWith('abc123', 'def456')
    })

    it('should return null when diff not available', () => {
      vi.mocked(gitRepo.getDiffSummary).mockReturnValue(null as string | null)

      const result = domain.getDiffSummary('abc123', 'def456')

      expect(result).toBeNull()
      expect(gitRepo.getDiffSummary).toHaveBeenCalledWith('abc123', 'def456')
    })
  })

  describe('getDiff', () => {
    it('should return full diff between two commits', () => {
      const expectedDiff = '--- a/file.ts\n+++ b/file.ts\n@@ -1,3 +1,4 @@\n+new line'
      vi.mocked(gitRepo.getDiff).mockReturnValue(expectedDiff as string | null)

      const result = domain.getDiff('abc123', 'def456')

      expect(result).toBe(expectedDiff)
      expect(gitRepo.getDiff).toHaveBeenCalledWith('abc123', 'def456')
    })

    it('should return null when diff not available', () => {
      vi.mocked(gitRepo.getDiff).mockReturnValue(null as string | null)

      const result = domain.getDiff('abc123', 'def456')

      expect(result).toBeNull()
      expect(gitRepo.getDiff).toHaveBeenCalledWith('abc123', 'def456')
    })
  })

  describe('commitMove', () => {
    it('should stage original file as updated', () => {
      vi.mocked(resolve).mockReturnValue('/home/user/task1.json')
      vi.mocked(dirname).mockReturnValue('/home/user')
      vi.mocked(basename).mockReturnValue('task1.json')
      vi.mocked(join).mockReturnValue('/home/user/done/task1.json')

      domain.commitMove('/home/user/task1.json', 'done/task1.json')

      expect(gitRepo.stageUpdated).toHaveBeenCalledWith('/home/user/task1.json')
    })

    it('should stage new file in done directory', () => {
      vi.mocked(resolve).mockReturnValue('/home/user/task1.json')
      vi.mocked(dirname).mockReturnValue('/home/user')
      vi.mocked(basename).mockReturnValue('task1.json')
      vi.mocked(join).mockReturnValue('/home/user/done/task1.json')

      domain.commitMove('/home/user/task1.json', 'done/task1.json')

      expect(gitRepo.stageNew).toHaveBeenCalledWith('/home/user/done/task1.json')
    })

    it('should stage tmp directory for tracking', () => {
      vi.mocked(resolve).mockReturnValue('/home/user/task1.json')
      vi.mocked(dirname).mockReturnValue('/home/user')
      vi.mocked(basename).mockReturnValue('task1.json')
      vi.mocked(join).mockReturnValue('/home/user/done/task1.json')

      domain.commitMove('/home/user/task1.json', 'done/task1.json')

      expect(gitRepo.stageUpdated).toHaveBeenCalledWith('.claude/tmp/')
    })

    it('should create commit with filename in message', () => {
      vi.mocked(resolve).mockReturnValue('/home/user/task1.json')
      vi.mocked(dirname).mockReturnValue('/home/user')
      vi.mocked(basename).mockReturnValue('task1.json')
      vi.mocked(join).mockReturnValue('/home/user/done/task1.json')

      domain.commitMove('/home/user/task1.json', 'done/task1.json')

      expect(gitRepo.commit).toHaveBeenCalledWith('chore: mv task1.json')
    })

    it('should catch error when staging original file fails', () => {
      vi.mocked(resolve).mockReturnValue('/home/user/task1.json')
      vi.mocked(dirname).mockReturnValue('/home/user')
      vi.mocked(basename).mockReturnValue('task1.json')
      vi.mocked(join).mockReturnValue('/home/user/done/task1.json')
      vi.mocked(gitRepo.stageUpdated).mockImplementationOnce(() => {
        throw new Error('not a tracked file')
      })

      // Should not throw
      expect(() => domain.commitMove('/home/user/task1.json', 'done/task1.json')).not.toThrow()

      // But should still stage new file and commit
      expect(gitRepo.stageNew).toHaveBeenCalled()
      expect(gitRepo.commit).toHaveBeenCalled()
    })

    it('should catch error when staging new file fails', () => {
      vi.mocked(resolve).mockReturnValue('/home/user/task1.json')
      vi.mocked(dirname).mockReturnValue('/home/user')
      vi.mocked(basename).mockReturnValue('task1.json')
      vi.mocked(join).mockReturnValue('/home/user/done/task1.json')
      vi.mocked(gitRepo.stageNew).mockImplementationOnce(() => {
        throw new Error('file may not exist yet')
      })

      // Should not throw
      expect(() => domain.commitMove('/home/user/task1.json', 'done/task1.json')).not.toThrow()

      // But should still stage tmp and commit
      expect(gitRepo.stageUpdated).toHaveBeenCalledWith('.claude/tmp/')
      expect(gitRepo.commit).toHaveBeenCalled()
    })

    it('should catch error when staging tmp dir fails', () => {
      vi.mocked(resolve).mockReturnValue('/home/user/task1.json')
      vi.mocked(dirname).mockReturnValue('/home/user')
      vi.mocked(basename).mockReturnValue('task1.json')
      vi.mocked(join).mockReturnValue('/home/user/done/task1.json')
      vi.mocked(gitRepo.stageUpdated).mockImplementationOnce(() => {
        throw new Error('not a tracked file')
      })
      vi.mocked(gitRepo.stageUpdated).mockImplementationOnce(() => {
        throw new Error('no tracked tmp files')
      })

      // Should not throw
      expect(() => domain.commitMove('/home/user/task1.json', 'done/task1.json')).not.toThrow()

      // But should still commit
      expect(gitRepo.commit).toHaveBeenCalled()
    })

    it('should skip staging tmp dir when hasTrackedFiles returns false', () => {
      vi.mocked(resolve).mockReturnValue('/home/user/task1.json')
      vi.mocked(dirname).mockReturnValue('/home/user')
      vi.mocked(basename).mockReturnValue('task1.json')
      vi.mocked(join).mockReturnValue('/home/user/done/task1.json')
      vi.mocked(gitRepo.hasTrackedFiles).mockReturnValue(false)

      domain.commitMove('/home/user/task1.json', 'done/task1.json')

      expect(gitRepo.hasTrackedFiles).toHaveBeenCalledWith('.claude/tmp/')
      expect(gitRepo.stageUpdated).not.toHaveBeenCalledWith('.claude/tmp/')
      expect(gitRepo.commit).toHaveBeenCalled()
    })

    it('should catch error when commit fails due to not being in git repo', () => {
      vi.mocked(resolve).mockReturnValue('/home/user/task1.json')
      vi.mocked(dirname).mockReturnValue('/home/user')
      vi.mocked(basename).mockReturnValue('task1.json')
      vi.mocked(join).mockReturnValue('/home/user/done/task1.json')
      vi.mocked(gitRepo.commit).mockImplementationOnce(() => {
        throw new Error('not in a git repo')
      })

      // Should not throw
      expect(() => domain.commitMove('/home/user/task1.json', 'done/task1.json')).not.toThrow()
    })
  })

  describe('cleanTmpDir', () => {
    it('should clean .claude/tmp/ directory', () => {
      domain.cleanTmpDir()

      expect(fileMoveRepo.cleanDir).toHaveBeenCalledWith('.claude/tmp/')
    })

    it('should invoke cleanDir exactly once', () => {
      domain.cleanTmpDir()

      expect(fileMoveRepo.cleanDir).toHaveBeenCalledTimes(1)
    })
  })

  describe('loadRawPipeline', () => {
    it('should load raw pipeline from file repository', () => {
      const expectedPipeline = { tasks: [{ id: 'task1', type: 'agent' }] }
      vi.mocked(fileMoveRepo.readRaw).mockReturnValue(expectedPipeline as unknown)

      const result = domain.loadRawPipeline('/home/user/pipeline.json')

      expect(result).toEqual(expectedPipeline)
      expect(fileMoveRepo.readRaw).toHaveBeenCalledWith('/home/user/pipeline.json')
    })

    it('should return raw JSON object from repository', () => {
      const rawData = { random: 'data', nested: { value: 42 } }
      vi.mocked(fileMoveRepo.readRaw).mockReturnValue(rawData as unknown)

      const result = domain.loadRawPipeline('/path/to/file.json')

      expect(result).toBe(rawData)
    })

    it('should pass absolute path to repository method', () => {
      vi.mocked(fileMoveRepo.readRaw).mockReturnValue({} as unknown)

      domain.loadRawPipeline('/absolute/path/file.json')

      expect(fileMoveRepo.readRaw).toHaveBeenCalledWith('/absolute/path/file.json')
    })
  })

  describe('savePipeline', () => {
    it('should save pipeline to file repository', () => {
      const pipeline: Pipeline = { tasks: [{ type: 'agent', task: 'task1' }] }

      domain.savePipeline('/home/user/pipeline.json', pipeline)

      expect(fileMoveRepo.write).toHaveBeenCalledWith('/home/user/pipeline.json', pipeline)
    })

    it('should save pipeline with correct path and data', () => {
      const pipeline: Pipeline = {
        tasks: [
          { type: 'agent', task: 'agent1' },
          { type: 'script', command: 'echo script1' }
        ]
      }

      domain.savePipeline('/path/to/output.json', pipeline)

      expect(fileMoveRepo.write).toHaveBeenCalledWith('/path/to/output.json', pipeline)
      expect(fileMoveRepo.write).toHaveBeenCalledTimes(1)
    })

    it('should write JSON exactly once per invocation', () => {
      const pipeline: Pipeline = { tasks: [] }

      domain.savePipeline('/path/file.json', pipeline)
      domain.savePipeline('/path/file2.json', pipeline)

      expect(fileMoveRepo.write).toHaveBeenCalledTimes(2)
    })
  })
})
