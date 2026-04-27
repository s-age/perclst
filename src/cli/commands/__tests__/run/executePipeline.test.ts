import { vi, describe, it, expect, beforeEach } from 'vitest'
import { runCommand } from '../../run'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { stdout, stderr } from '@src/utils/output'
import { parseRunOptions, parsePipeline } from '@src/validators/cli/runPipeline'
import type { PipelineTaskResult } from '@src/services/pipelineService'
import type { Config } from '@src/types/config'
import type { Pipeline } from '@src/types/pipeline'

vi.mock('readline')
vi.mock('@src/core/di/container')
vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/validators/cli/runPipeline')
vi.mock('os')
vi.mock('path')

describe('executePipeline', () => {
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

  beforeEach(() => {
    vi.clearAllMocks()

    mockStdout = { print: vi.fn() }
    vi.mocked(stdout).print = mockStdout.print as never
    vi.mocked(stderr).print = vi.fn() as never

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

    vi.mocked(container).resolve = vi.fn().mockImplementation((token: unknown) => {
      if (token === TOKENS.PipelineFileService) return mockPipelineFileService
      if (token === TOKENS.PipelineService) return mockPipelineService
      if (token === TOKENS.AbortService) return mockAbortService
      if (token === TOKENS.Config) return mockConfig
      return null
    }) as never

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
    global.process = { ...process, exit: mockExit as any, once: mockOnce as any }
    Object.defineProperty(process.stdout, 'isTTY', { value: false, writable: true })
  })

  it('should run pipeline and iterate results', async () => {
    const result: PipelineTaskResult = {
      kind: 'script',
      taskPath: [],
      taskIndex: 0,
      command: 'test',
      result: { exitCode: 0, stdout: '', stderr: '' }
    }
    mockPipelineService.run.mockImplementation(async function* () {
      yield result
    })

    const pipeline: Pipeline = { tasks: [] }
    vi.mocked(parsePipeline).mockReturnValue(pipeline)

    await runCommand('test.json', {})

    expect(mockPipelineService.run).toHaveBeenCalled()
    expect(mockStdout.print).toHaveBeenCalledWith(expect.stringContaining('Pipeline complete'))
  })

  it('should count completed tasks', async () => {
    const results: PipelineTaskResult[] = [
      {
        kind: 'script',
        taskPath: [],
        taskIndex: 0,
        command: 'test1',
        result: { exitCode: 0, stdout: '', stderr: '' }
      },
      {
        kind: 'script',
        taskPath: [],
        taskIndex: 1,
        command: 'test2',
        result: { exitCode: 0, stdout: '', stderr: '' }
      }
    ]
    mockPipelineService.run.mockImplementation(async function* () {
      yield results[0]
      yield results[1]
    })

    const pipeline: Pipeline = { tasks: [] }
    vi.mocked(parsePipeline).mockReturnValue(pipeline)

    await runCommand('test.json', {})

    expect(mockStdout.print).toHaveBeenCalledWith(expect.stringContaining('2 task(s) finished'))
  })

  it('should provide stream event handler when not output only', async () => {
    mockPipelineService.run.mockImplementation(async function* () {
      yield undefined
    })

    const pipeline: Pipeline = { tasks: [] }
    vi.mocked(parsePipeline).mockReturnValue(pipeline)

    await runCommand('test.json', {})

    expect(mockPipelineService.run).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        onStreamEvent: expect.any(Function)
      })
    )
  })

  it('should not provide stream event handler when output only', async () => {
    vi.mocked(parseRunOptions).mockReturnValue({
      pipelinePath: 'test.json',
      outputOnly: true,
      format: 'text',
      model: 'claude-sonnet-4-6',
      batch: false,
      yes: false
    })

    mockPipelineService.run.mockImplementation(async function* () {
      yield undefined
    })

    const pipeline: Pipeline = { tasks: [] }
    vi.mocked(parsePipeline).mockReturnValue(pipeline)

    await runCommand('test.json', {})

    expect(mockPipelineService.run).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        onStreamEvent: undefined
      })
    )
  })

  it('should not provide stream event handler for json format', async () => {
    vi.mocked(parseRunOptions).mockReturnValue({
      pipelinePath: 'test.json',
      outputOnly: false,
      format: 'json',
      model: 'claude-sonnet-4-6',
      batch: false,
      yes: false
    })

    mockPipelineService.run.mockImplementation(async function* () {
      yield undefined
    })

    const pipeline: Pipeline = { tasks: [] }
    vi.mocked(parsePipeline).mockReturnValue(pipeline)

    await runCommand('test.json', {})

    expect(mockPipelineService.run).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        onStreamEvent: undefined
      })
    )
  })

  it('should exit with error if pipeline file read fails', async () => {
    mockPipelineFileService.loadRawPipeline.mockImplementation(() => {
      throw new Error('File not found')
    })

    const pipeline: Pipeline = { tasks: [] }
    vi.mocked(parsePipeline).mockReturnValue(pipeline)

    await runCommand('test.json', {})

    expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
      expect.stringContaining('Failed to read pipeline file')
    )
    expect(global.process.exit).toHaveBeenCalledWith(1)
  })
})
