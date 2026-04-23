import { vi, describe, it, expect, beforeEach } from 'vitest'
import { runCommand } from '../../run'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { stdout, stderr } from '@src/utils/output'
import { printResponse } from '@src/cli/display'
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

describe('printTaskResult', () => {
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
    vi.mocked(stderr).print = vi.fn()

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

    vi.mocked(printResponse).mockImplementation(vi.fn())

    const mockExit = vi.fn()
    const mockOnce = vi.fn()
    global.process = { ...process, exit: mockExit, once: mockOnce }
    Object.defineProperty(process.stdout, 'isTTY', { value: false, writable: true })
  })

  it('should skip printing task_start results', async () => {
    const result: PipelineTaskResult = {
      kind: 'task_start',
      taskPath: [],
      taskIndex: 0
    }
    mockPipelineService.run.mockImplementation(async function* () {
      yield result
    })

    const pipeline: Pipeline = { name: 'test', tasks: [] }
    vi.mocked(parsePipeline).mockReturnValue(pipeline)

    await runCommand('test.json', {})

    expect(mockStdout.print).not.toHaveBeenCalledWith(expect.stringContaining('Task 1'))
  })

  it('should skip printing retry results', async () => {
    const result: PipelineTaskResult = {
      kind: 'retry',
      taskPath: [],
      taskIndex: 0,
      attempt: 1
    }
    mockPipelineService.run.mockImplementation(async function* () {
      yield result
    })

    const pipeline: Pipeline = { name: 'test', tasks: [] }
    vi.mocked(parsePipeline).mockReturnValue(pipeline)

    await runCommand('test.json', {})

    expect(mockStdout.print).not.toHaveBeenCalledWith(expect.stringContaining('Task 1'))
  })

  it('should skip printing pipeline_end results', async () => {
    const result: PipelineTaskResult = {
      kind: 'pipeline_end',
      taskPath: []
    }
    mockPipelineService.run.mockImplementation(async function* () {
      yield result
    })

    const pipeline: Pipeline = { name: 'test', tasks: [] }
    vi.mocked(parsePipeline).mockReturnValue(pipeline)

    await runCommand('test.json', {})

    expect(mockStdout.print).not.toHaveBeenCalledWith(expect.stringContaining('Task'))
  })

  it('should print script result with exit code 0', async () => {
    const result: PipelineTaskResult = {
      kind: 'script',
      taskPath: [],
      taskIndex: 0,
      command: 'echo hello',
      result: { exitCode: 0, stdout: 'hello', stderr: '' }
    }
    mockPipelineService.run.mockImplementation(async function* () {
      yield result
    })

    const pipeline: Pipeline = { name: 'test', tasks: [] }
    vi.mocked(parsePipeline).mockReturnValue(pipeline)

    await runCommand('test.json', {})

    expect(mockStdout.print).toHaveBeenCalledWith(expect.stringContaining('Task 1 [script] ok'))
    expect(mockStdout.print).toHaveBeenCalledWith('hello')
  })

  it('should print script result with non-zero exit code', async () => {
    const result: PipelineTaskResult = {
      kind: 'script',
      taskPath: [],
      taskIndex: 0,
      command: 'false',
      result: { exitCode: 1, stdout: '', stderr: 'error' }
    }
    mockPipelineService.run.mockImplementation(async function* () {
      yield result
    })

    const pipeline: Pipeline = { name: 'test', tasks: [] }
    vi.mocked(parsePipeline).mockReturnValue(pipeline)

    await runCommand('test.json', {})

    expect(mockStdout.print).toHaveBeenCalledWith(expect.stringContaining('Task 1 [script] exit 1'))
    expect(mockStdout.print).toHaveBeenCalledWith('error')
  })

  it('should print script stdout when present', async () => {
    const result: PipelineTaskResult = {
      kind: 'script',
      taskPath: [],
      taskIndex: 0,
      command: 'test',
      result: { exitCode: 0, stdout: 'output\n', stderr: '' }
    }
    mockPipelineService.run.mockImplementation(async function* () {
      yield result
    })

    const pipeline: Pipeline = { name: 'test', tasks: [] }
    vi.mocked(parsePipeline).mockReturnValue(pipeline)

    await runCommand('test.json', {})

    expect(mockStdout.print).toHaveBeenCalledWith('output')
  })

  it('should print script stderr when present', async () => {
    const result: PipelineTaskResult = {
      kind: 'script',
      taskPath: [],
      taskIndex: 0,
      command: 'test',
      result: { exitCode: 0, stdout: '', stderr: 'stderr output\n' }
    }
    mockPipelineService.run.mockImplementation(async function* () {
      yield result
    })

    const pipeline: Pipeline = { name: 'test', tasks: [] }
    vi.mocked(parsePipeline).mockReturnValue(pipeline)

    await runCommand('test.json', {})

    expect(mockStdout.print).toHaveBeenCalledWith('stderr output')
  })

  it('should print agent result with name and action', async () => {
    const result: PipelineTaskResult = {
      kind: 'agent',
      taskPath: [],
      taskIndex: 0,
      name: 'test agent',
      action: 'start',
      sessionId: 'session-123',
      response: 'agent response'
    }
    mockPipelineService.run.mockImplementation(async function* () {
      yield result
    })

    const pipeline: Pipeline = { name: 'test', tasks: [] }
    vi.mocked(parsePipeline).mockReturnValue(pipeline)

    await runCommand('test.json', {})

    expect(mockStdout.print).toHaveBeenCalledWith(
      expect.stringContaining('Task 1: test agent [start]')
    )
  })

  it('should print agent result without name', async () => {
    const result: PipelineTaskResult = {
      kind: 'agent',
      taskPath: [],
      taskIndex: 0,
      action: 'resume',
      sessionId: 'session-123',
      response: 'agent response'
    }
    mockPipelineService.run.mockImplementation(async function* () {
      yield result
    })

    const pipeline: Pipeline = { name: 'test', tasks: [] }
    vi.mocked(parsePipeline).mockReturnValue(pipeline)

    await runCommand('test.json', {})

    expect(mockStdout.print).toHaveBeenCalledWith(expect.stringContaining('Task 1 [resume]'))
  })

  it('should pass streaming flag to printResponse', async () => {
    const result: PipelineTaskResult = {
      kind: 'agent',
      taskPath: [],
      taskIndex: 0,
      action: 'start',
      sessionId: 'session-123',
      response: 'agent response'
    }
    mockPipelineService.run.mockImplementation(async function* () {
      yield result
    })

    const pipeline: Pipeline = { name: 'test', tasks: [] }
    vi.mocked(parsePipeline).mockReturnValue(pipeline)

    await runCommand('test.json', { outputOnly: true })

    expect(vi.mocked(printResponse)).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ silentThoughts: true, silentToolResponse: true }),
      expect.any(Object),
      expect.any(Object)
    )
  })
})
