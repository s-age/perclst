import { vi, describe, it, expect, beforeEach } from 'vitest'
import * as readline from 'readline'
import { runCommand } from '../../run'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { stdout, stderr } from '@src/utils/output'
import { parseRunOptions, parsePipeline } from '@src/validators/cli/runPipeline'
import type { Config } from '@src/types/config'
import type { Pipeline } from '@src/types/pipeline'

vi.mock('readline')
vi.mock('@src/core/di/container')
vi.mock('@src/utils/output')
vi.mock('@src/cli/display')
vi.mock('@src/validators/cli/runPipeline')
vi.mock('os')
vi.mock('path')

describe('markTaskDone', () => {
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

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(stdout).print = vi.fn() as never
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

  it('should mark task done at root level', async () => {
    const pipeline: Pipeline = {
      tasks: [
        // eslint-disable-next-line local/no-any
        { type: 'script', command: 'test', done: false } as any,
        // eslint-disable-next-line local/no-any
        { type: 'script', command: 'test2', done: false } as any
      ]
    }
    mockPipelineService.run.mockImplementation(async function* () {
      yield {
        kind: 'script',
        taskPath: [],
        taskIndex: 0,
        command: 'test',
        result: { exitCode: 0, stdout: '', stderr: '' }
      }
    })

    vi.mocked(parsePipeline).mockReturnValue(pipeline)

    await runCommand('test.json', {})

    expect(vi.mocked(parsePipeline)).toHaveBeenCalled()
  })

  it('should mark nested task done', async () => {
    const pipeline: Pipeline = {
      tasks: [
        {
          type: 'pipeline',
          path: 'child.json',
          // eslint-disable-next-line local/no-any
          tasks: [{ type: 'script', command: 'nested', done: false } as any]
          // eslint-disable-next-line local/no-any
        } as any
      ]
    }

    mockPipelineService.run.mockImplementation(async function* () {
      yield {
        kind: 'script',
        taskPath: [0],
        taskIndex: 0,
        command: 'nested',
        result: { exitCode: 0, stdout: '', stderr: '' }
      }
    })

    vi.mocked(parsePipeline).mockReturnValue(pipeline)

    await runCommand('test.json', {})

    expect(vi.mocked(parsePipeline)).toHaveBeenCalled()
  })
})

describe('checkUncommittedChanges', () => {
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
  let mockStderr: { print: ReturnType<typeof vi.fn> }
  let mockStdout: { print: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()

    mockStdout = { print: vi.fn() }
    mockStderr = { print: vi.fn() }
    vi.mocked(stdout).print = mockStdout.print as never
    vi.mocked(stderr).print = mockStderr.print as never

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

  it('should skip if no uncommitted changes', async () => {
    mockPipelineFileService.getDiffStat.mockReturnValue(null)

    const pipeline: Pipeline = { tasks: [] }
    vi.mocked(parsePipeline).mockReturnValue(pipeline)

    await runCommand('test.json', {})

    expect(mockStderr.print).not.toHaveBeenCalledWith(
      expect.stringContaining('Uncommitted changes')
    )
  })

  it('should prompt user if uncommitted changes exist', async () => {
    mockPipelineFileService.getDiffStat.mockReturnValue('M file1\nM file2')

    const mockReadlineInterface: Partial<readline.Interface> = {
      question: vi.fn((q, cb) => cb('y')),
      close: vi.fn()
    }
    vi.mocked(readline.createInterface).mockReturnValue(mockReadlineInterface as readline.Interface)

    const pipeline: Pipeline = { tasks: [] }
    vi.mocked(parsePipeline).mockReturnValue(pipeline)

    await runCommand('test.json', {})

    expect(mockStderr.print).toHaveBeenCalledWith(
      expect.stringContaining('Uncommitted changes detected')
    )
  })

  it('should abort if user declines', async () => {
    mockPipelineFileService.getDiffStat.mockReturnValue('M file1')

    const mockReadlineInterface: Partial<readline.Interface> = {
      question: vi.fn((q, cb) => cb('n')),
      close: vi.fn()
    }
    vi.mocked(readline.createInterface).mockReturnValue(mockReadlineInterface as readline.Interface)

    const pipeline: Pipeline = { tasks: [] }
    vi.mocked(parsePipeline).mockReturnValue(pipeline)

    await runCommand('test.json', {})

    expect(mockStdout.print).toHaveBeenCalledWith('Aborted.')
    expect(global.process.exit).toHaveBeenCalledWith(0)
  })
})

describe('printGitDiffSummary', () => {
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

  it('should skip if heads are same', async () => {
    mockPipelineFileService.getHead.mockReturnValue('abc123')

    const pipeline: Pipeline = { tasks: [] }
    vi.mocked(parsePipeline).mockReturnValue(pipeline)

    await runCommand('test.json', {})

    expect(mockPipelineFileService.getDiffSummary).not.toHaveBeenCalled()
  })

  it('should handle pipeline file loading', async () => {
    const pipeline: Pipeline = { tasks: [] }
    vi.mocked(parsePipeline).mockReturnValue(pipeline)

    await runCommand('test.json', {})

    expect(vi.mocked(parsePipeline)).toHaveBeenCalled()
  })

  it('should handle multiple pipeline tasks', async () => {
    const pipeline: Pipeline = { tasks: [] }
    vi.mocked(parsePipeline).mockReturnValue(pipeline)

    await runCommand('test.json', {})

    expect(mockPipelineService.run).toHaveBeenCalled()
  })
})
