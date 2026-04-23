import { vi, describe, it, expect, beforeEach } from 'vitest'
import { runCommand } from '../../run'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { stdout } from '@src/utils/output'
import { parseRunOptions, parsePipeline } from '@src/validators/cli/runPipeline'
import type { PipelineTaskResult } from '@src/services/pipelineService'
import type { Config } from '@src/types/config'
import type { Pipeline } from '@src/types/pipeline'

vi.mock('readline')
vi.mock('@src/core/di/container')
vi.mock('@src/utils/output')
vi.mock('@src/cli/display')
vi.mock('@src/validators/cli/runPipeline')
vi.mock('os')
vi.mock('path')

describe('taskLabel', () => {
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
    vi.mocked(stdout).print = mockStdout.print

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

    // Setup async generator
    mockPipelineService.run.mockImplementation(async function* () {
      yield undefined
    })

    const mockExit = vi.fn()
    const mockOnce = vi.fn()
    global.process = { ...process, exit: mockExit, once: mockOnce }
    Object.defineProperty(process.stdout, 'isTTY', { value: false, writable: true })
  })

  it('should format task label with no parent path', async () => {
    const result: PipelineTaskResult = {
      kind: 'script',
      taskPath: [],
      taskIndex: 0,
      command: 'echo test',
      result: { exitCode: 0, stdout: '', stderr: '' }
    }
    mockPipelineService.run.mockImplementation(async function* () {
      yield result
    })

    const pipeline: Pipeline = { name: 'test', tasks: [] }
    vi.mocked(parsePipeline).mockReturnValue(pipeline)

    await runCommand('test.json', {})

    expect(mockStdout.print).toHaveBeenCalledWith(expect.stringContaining('Task 1'))
  })

  it('should format task label with parent path', async () => {
    const result: PipelineTaskResult = {
      kind: 'script',
      taskPath: [0, 1],
      taskIndex: 2,
      command: 'test',
      result: { exitCode: 0, stdout: '', stderr: '' }
    }
    mockPipelineService.run.mockImplementation(async function* () {
      yield result
    })

    const pipeline: Pipeline = { name: 'test', tasks: [] }
    vi.mocked(parsePipeline).mockReturnValue(pipeline)

    await runCommand('test.json', {})

    expect(mockStdout.print).toHaveBeenCalledWith(expect.stringContaining('Task 1.2.3'))
  })
})
