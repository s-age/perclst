import { vi, describe, it, expect, beforeEach } from 'vitest'
import { runCommand } from '../../run'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { stdout, stderr } from '@src/utils/output'
import { parseRunOptions, parsePipeline } from '@src/validators/cli/runPipeline'
import { ValidationError } from '@src/errors/validationError'
import { RateLimitError } from '@src/errors/rateLimitError'
import { APIError } from '@src/errors/apiError'
import { PipelineMaxRetriesError } from '@src/errors/pipelineMaxRetriesError'
import type { Config } from '@src/types/config'
import type { Pipeline } from '@src/types/pipeline'

vi.mock('readline')
vi.mock('@src/core/di/container')
vi.mock('@src/utils/output')
vi.mock('@src/cli/display')
vi.mock('@src/validators/cli/runPipeline')
vi.mock('os')
vi.mock('path')

describe('runCommand', () => {
  let mockPipelineFileService: {
    loadRawPipeline: ReturnType<typeof vi.fn>
    savePipeline: ReturnType<typeof vi.fn>
    getDiffStat: ReturnType<typeof vi.fn>
    getDiffSummary: ReturnType<typeof vi.fn>
    getHead: ReturnType<typeof vi.fn>
    moveToDone: ReturnType<typeof vi.fn>
    commitMove: ReturnType<typeof vi.fn>
    cleanTmpDir: ReturnType<typeof vi.fn>
  }
  let mockPipelineService: {
    run: ReturnType<typeof vi.fn>
  }
  let mockAbortService: {
    signal: AbortSignal
    abort: ReturnType<typeof vi.fn>
  }
  let mockStdout: { print: ReturnType<typeof vi.fn> }
  let mockStderr: { print: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()

    mockStdout = { print: vi.fn() }
    mockStderr = { print: vi.fn() }
    vi.mocked(stdout).print = mockStdout.print
    vi.mocked(stderr).print = mockStderr.print

    mockPipelineFileService = {
      loadRawPipeline: vi.fn(),
      savePipeline: vi.fn(),
      getDiffStat: vi.fn(),
      getDiffSummary: vi.fn(),
      getHead: vi.fn(),
      moveToDone: vi.fn(),
      commitMove: vi.fn(),
      cleanTmpDir: vi.fn()
    }

    mockPipelineService = {
      run: vi.fn()
    }

    const mockSignal = new AbortController().signal
    mockAbortService = {
      signal: mockSignal,
      abort: vi.fn()
    }

    const mockConfig: Config = {
      display: { header_color: '#D97757', no_color: false }
    } as Config

    vi.mocked(container).resolve = vi.fn((token) => {
      if (token === TOKENS.PipelineFileService) return mockPipelineFileService
      if (token === TOKENS.PipelineService) return mockPipelineService
      if (token === TOKENS.AbortService) return mockAbortService
      if (token === TOKENS.Config) return mockConfig
      return null
    })

    vi.mocked(parseRunOptions).mockReturnValue({
      pipelinePath: 'test.json',
      outputOnly: false,
      format: 'text',
      model: 'claude-sonnet-4-6',
      batch: false,
      yes: false
    })

    mockPipelineFileService.getDiffStat.mockReturnValue(null)
    mockPipelineFileService.getHead.mockReturnValue(null)
    mockPipelineFileService.moveToDone.mockReturnValue(null)
    mockPipelineFileService.cleanTmpDir.mockReturnValue(undefined)

    mockPipelineService.run.mockImplementation(async function* () {
      yield undefined
    })

    const mockExit = vi.fn()
    const mockOnce = vi.fn()
    // eslint-disable-next-line local/no-any
    global.process = { ...process, exit: mockExit, once: mockOnce } as any
    Object.defineProperty(process.stdout, 'isTTY', { value: false, writable: true })

    const pipeline: Pipeline = { name: 'test', tasks: [] }
    vi.mocked(parsePipeline).mockReturnValue(pipeline)
  })

  it('should resolve pipeline path', async () => {
    await runCommand('test.json', {})

    expect(vi.mocked(parseRunOptions)).toHaveBeenCalled()
  })

  it('should run pipeline service', async () => {
    await runCommand('test.json', {})

    expect(mockPipelineService.run).toHaveBeenCalled()
  })

  it('should skip move if no done directory', async () => {
    mockPipelineFileService.moveToDone.mockReturnValue(null)

    await runCommand('test.json', {})

    expect(mockPipelineFileService.commitMove).not.toHaveBeenCalled()
  })

  it('should complete pipeline execution', async () => {
    await runCommand('test.json', {})

    expect(mockPipelineService.run).toHaveBeenCalled()
  })

  it('should handle ValidationError', async () => {
    vi.mocked(parseRunOptions).mockImplementation(() => {
      throw new ValidationError('Invalid option')
    })

    await runCommand('test.json', {})

    expect(mockStderr.print).toHaveBeenCalledWith(expect.stringContaining('Invalid arguments'))
    expect(global.process.exit).toHaveBeenCalledWith(1)
  })

  it('should handle PipelineMaxRetriesError', async () => {
    mockPipelineService.run.mockImplementation(async function* () {
      yield undefined
      throw new PipelineMaxRetriesError('Max retries exceeded')
    })

    await runCommand('test.json', {})

    expect(mockStderr.print).toHaveBeenCalled()
    expect(global.process.exit).toHaveBeenCalledWith(1)
  })

  it('should handle RateLimitError with reset info', async () => {
    mockPipelineService.run.mockImplementation(async function* () {
      yield undefined
      const error = new RateLimitError('Rate limited')
      error.resetInfo = '2024-01-01 12:00:00'
      throw error
    })

    await runCommand('test.json', {})

    expect(mockStderr.print).toHaveBeenCalled()
    expect(global.process.exit).toHaveBeenCalledWith(1)
  })

  it('should handle RateLimitError without reset info', async () => {
    mockPipelineService.run.mockImplementation(async function* () {
      yield undefined
      throw new RateLimitError('Rate limited')
    })

    await runCommand('test.json', {})

    expect(mockStderr.print).toHaveBeenCalled()
    expect(global.process.exit).toHaveBeenCalledWith(1)
  })

  it('should handle APIError', async () => {
    mockPipelineService.run.mockImplementation(async function* () {
      yield undefined
      throw new APIError('API request failed')
    })

    await runCommand('test.json', {})

    expect(mockStderr.print).toHaveBeenCalled()
    expect(global.process.exit).toHaveBeenCalledWith(1)
  })

  it('should handle generic Error', async () => {
    mockPipelineService.run.mockImplementation(async function* () {
      yield undefined
      throw new Error('Unexpected error')
    })

    await runCommand('test.json', {})

    expect(mockStderr.print).toHaveBeenCalledWith('Pipeline failed', expect.any(Error))
    expect(global.process.exit).toHaveBeenCalledWith(1)
  })

  it('should check uncommitted changes before execution', async () => {
    await runCommand('test.json', {})

    expect(mockPipelineFileService.getDiffStat).toHaveBeenCalled()
  })

  it('should track git state during execution', async () => {
    await runCommand('test.json', {})

    expect(mockPipelineFileService.getHead).toHaveBeenCalled()
  })

  it('should skip diff summary if heads are same', async () => {
    mockPipelineFileService.getHead.mockReturnValue('abc123')

    await runCommand('test.json', {})

    expect(mockPipelineFileService.getDiffSummary).not.toHaveBeenCalled()
  })

  it('should accept model option', async () => {
    await runCommand('test.json', { model: 'claude-opus-4-5' })

    expect(vi.mocked(parseRunOptions)).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-opus-4-5' })
    )
  })

  it('should accept outputOnly option', async () => {
    await runCommand('test.json', { outputOnly: true })

    expect(vi.mocked(parseRunOptions)).toHaveBeenCalledWith(
      expect.objectContaining({ outputOnly: true })
    )
  })

  it('should accept batch option', async () => {
    await runCommand('test.json', { batch: true })

    expect(vi.mocked(parseRunOptions)).toHaveBeenCalledWith(
      expect.objectContaining({ batch: true })
    )
  })

  it('should accept yes option', async () => {
    await runCommand('test.json', { yes: true })

    expect(vi.mocked(parseRunOptions)).toHaveBeenCalledWith(expect.objectContaining({ yes: true }))
  })

  it('should accept format option', async () => {
    await runCommand('test.json', { format: 'json' })

    expect(vi.mocked(parseRunOptions)).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'json' })
    )
  })
})
