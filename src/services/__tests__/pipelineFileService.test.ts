import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PipelineFileService } from '../pipelineFileService'
import type { IPipelineFileDomain } from '@src/domains/ports/pipelineFile'
import type { Pipeline } from '@src/types/pipeline'

describe('PipelineFileService', () => {
  let mockPipelineFileDomain: IPipelineFileDomain
  let service: PipelineFileService

  beforeEach(() => {
    mockPipelineFileDomain = {
      moveToDone: vi.fn(),
      getDiffStat: vi.fn(),
      getHead: vi.fn(),
      getDiffSummary: vi.fn(),
      getDiff: vi.fn(),
      commitMove: vi.fn(),
      cleanTmpDir: vi.fn(),
      loadRawPipeline: vi.fn(),
      savePipeline: vi.fn()
    }

    service = new PipelineFileService(mockPipelineFileDomain)
  })

  describe('moveToDone', () => {
    it('should delegate to domain.moveToDone with pipelinePath and return the result', () => {
      const pipelinePath = '/path/to/pipeline.json'
      const expectedResult = '/path/to/done/pipeline.json'
      vi.mocked(mockPipelineFileDomain.moveToDone).mockReturnValue(expectedResult)

      const result = service.moveToDone(pipelinePath)

      expect(mockPipelineFileDomain.moveToDone).toHaveBeenCalledWith(pipelinePath)
      expect(mockPipelineFileDomain.moveToDone).toHaveBeenCalledTimes(1)
      expect(result).toBe(expectedResult)
    })

    it('should return null when domain.moveToDone returns null', () => {
      const pipelinePath = '/path/to/pipeline.json'
      vi.mocked(mockPipelineFileDomain.moveToDone).mockReturnValue(null)

      const result = service.moveToDone(pipelinePath)

      expect(result).toBeNull()
    })
  })

  describe('getDiffStat', () => {
    it('should delegate to domain.getDiffStat and return the result', () => {
      const expectedResult = '1 file changed, 5 insertions(+), 2 deletions(-)'
      vi.mocked(mockPipelineFileDomain.getDiffStat).mockReturnValue(expectedResult)

      const result = service.getDiffStat()

      expect(mockPipelineFileDomain.getDiffStat).toHaveBeenCalledWith()
      expect(mockPipelineFileDomain.getDiffStat).toHaveBeenCalledTimes(1)
      expect(result).toBe(expectedResult)
    })

    it('should return null when domain.getDiffStat returns null', () => {
      vi.mocked(mockPipelineFileDomain.getDiffStat).mockReturnValue(null)

      const result = service.getDiffStat()

      expect(result).toBeNull()
    })
  })

  describe('getHead', () => {
    it('should delegate to domain.getHead and return the result', () => {
      const expectedResult = 'abc1234567890'
      vi.mocked(mockPipelineFileDomain.getHead).mockReturnValue(expectedResult)

      const result = service.getHead()

      expect(mockPipelineFileDomain.getHead).toHaveBeenCalledWith()
      expect(mockPipelineFileDomain.getHead).toHaveBeenCalledTimes(1)
      expect(result).toBe(expectedResult)
    })

    it('should return null when domain.getHead returns null', () => {
      vi.mocked(mockPipelineFileDomain.getHead).mockReturnValue(null)

      const result = service.getHead()

      expect(result).toBeNull()
    })
  })

  describe('getDiffSummary', () => {
    it('should delegate to domain.getDiffSummary with from and to arguments', () => {
      const from = 'abc1234'
      const to = 'def5678'
      const expectedResult = 'Summary of changes'
      vi.mocked(mockPipelineFileDomain.getDiffSummary).mockReturnValue(expectedResult)

      const result = service.getDiffSummary(from, to)

      expect(mockPipelineFileDomain.getDiffSummary).toHaveBeenCalledWith(from, to)
      expect(mockPipelineFileDomain.getDiffSummary).toHaveBeenCalledTimes(1)
      expect(result).toBe(expectedResult)
    })

    it('should return null when domain.getDiffSummary returns null', () => {
      const from = 'abc1234'
      const to = 'def5678'
      vi.mocked(mockPipelineFileDomain.getDiffSummary).mockReturnValue(null)

      const result = service.getDiffSummary(from, to)

      expect(result).toBeNull()
    })
  })

  describe('getDiff', () => {
    it('should delegate to domain.getDiff with from and to arguments', () => {
      const from = 'abc1234'
      const to = 'def5678'
      const expectedResult = 'diff --git a/file.json b/file.json\nindex abc..def\n'
      vi.mocked(mockPipelineFileDomain.getDiff).mockReturnValue(expectedResult)

      const result = service.getDiff(from, to)

      expect(mockPipelineFileDomain.getDiff).toHaveBeenCalledWith(from, to)
      expect(mockPipelineFileDomain.getDiff).toHaveBeenCalledTimes(1)
      expect(result).toBe(expectedResult)
    })

    it('should return null when domain.getDiff returns null', () => {
      const from = 'abc1234'
      const to = 'def5678'
      vi.mocked(mockPipelineFileDomain.getDiff).mockReturnValue(null)

      const result = service.getDiff(from, to)

      expect(result).toBeNull()
    })
  })

  describe('commitMove', () => {
    it('should delegate to domain.commitMove with originalPath and donePath', () => {
      const originalPath = '/path/to/original.json'
      const donePath = '/path/to/done.json'

      service.commitMove(originalPath, donePath)

      expect(mockPipelineFileDomain.commitMove).toHaveBeenCalledWith(originalPath, donePath)
      expect(mockPipelineFileDomain.commitMove).toHaveBeenCalledTimes(1)
    })
  })

  describe('cleanTmpDir', () => {
    it('should delegate to domain.cleanTmpDir', () => {
      service.cleanTmpDir()

      expect(mockPipelineFileDomain.cleanTmpDir).toHaveBeenCalledWith()
      expect(mockPipelineFileDomain.cleanTmpDir).toHaveBeenCalledTimes(1)
    })
  })

  describe('loadRawPipeline', () => {
    it('should delegate to domain.loadRawPipeline with absolutePath and return the result', () => {
      const absolutePath = '/absolute/path/to/pipeline.json'
      const expectedResult = { tasks: [{ type: 'script', command: 'echo hello' }] }
      vi.mocked(mockPipelineFileDomain.loadRawPipeline).mockReturnValue(expectedResult)

      const result = service.loadRawPipeline(absolutePath)

      expect(mockPipelineFileDomain.loadRawPipeline).toHaveBeenCalledWith(absolutePath)
      expect(mockPipelineFileDomain.loadRawPipeline).toHaveBeenCalledTimes(1)
      expect(result).toBe(expectedResult)
    })

    it('should return undefined when domain.loadRawPipeline returns undefined', () => {
      const absolutePath = '/absolute/path/to/pipeline.json'
      vi.mocked(mockPipelineFileDomain.loadRawPipeline).mockReturnValue(undefined)

      const result = service.loadRawPipeline(absolutePath)

      expect(result).toBeUndefined()
    })
  })

  describe('savePipeline', () => {
    it('should delegate to domain.savePipeline with absolutePath and pipeline', () => {
      const absolutePath = '/absolute/path/to/pipeline.json'
      const pipeline: Pipeline = {
        tasks: [{ type: 'script', command: 'echo hello' }]
      }

      service.savePipeline(absolutePath, pipeline)

      expect(mockPipelineFileDomain.savePipeline).toHaveBeenCalledWith(absolutePath, pipeline)
      expect(mockPipelineFileDomain.savePipeline).toHaveBeenCalledTimes(1)
    })

    it('should pass through the pipeline object exactly as provided', () => {
      const absolutePath = '/path/to/save'
      const pipeline: Pipeline = {
        tasks: [
          { type: 'agent', prompt: 'task 1' },
          { type: 'script', command: 'echo done' }
        ]
      }

      service.savePipeline(absolutePath, pipeline)

      expect(mockPipelineFileDomain.savePipeline).toHaveBeenCalledWith(
        absolutePath,
        expect.objectContaining({
          tasks: expect.arrayContaining([
            expect.objectContaining({ type: 'agent' }),
            expect.objectContaining({ type: 'script' })
          ])
        })
      )
    })
  })
})
