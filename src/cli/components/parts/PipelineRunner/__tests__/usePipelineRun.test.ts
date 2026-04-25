import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useState, useEffect } from 'react'
import type { PipelineTaskResult } from '@src/services/pipelineService.js'
import type { TaskState } from '../types.js'
import {
  taskSep,
  updateAtPath,
  upsertAtPath,
  applyResult,
  runPipeline,
  usePipelineRun
} from '../usePipelineRun.js'

vi.mock('react', () => ({
  useState: vi.fn(),
  useEffect: vi.fn()
}))

// ─── helpers ────────────────────────────────────────────────────────────────

async function* makeGen<T>(...items: T[]): AsyncGenerator<T> {
  for (const item of items) yield item
}

/** Creates an async generator that immediately throws `err` without emitting values. */
async function* makeThrowingGen<T>(err: unknown): AsyncGenerator<T> {
  yield* new Array<T>() // empty delegation satisfies require-yield; emits nothing
  throw err
}

function makeTask(overrides: Partial<TaskState> = {}): TaskState {
  return { name: 'Task', taskType: 'agent', status: 'pending', ...overrides }
}

// ─── taskSep ────────────────────────────────────────────────────────────────

describe('taskSep', () => {
  it('formats root task with name', () => {
    expect(taskSep([], 0, 'MyTask', 'agent')).toBe('─── 1. MyTask [agent] ───')
  })

  it('formats root task without name', () => {
    expect(taskSep([], 0, undefined, 'script')).toBe('─── task 1 [script] ───')
  })

  it('formats nested task with name using 1-based dot path', () => {
    expect(taskSep([0, 1], 2, 'Deep', 'child')).toBe('─── 1.2.3. Deep [child] ───')
  })

  it('formats nested task without name', () => {
    expect(taskSep([2], 1, undefined, 'pipeline')).toBe('─── task 3.2 [pipeline] ───')
  })
})

// ─── updateAtPath ────────────────────────────────────────────────────────────

describe('updateAtPath', () => {
  it('updates task at target index when path is empty', () => {
    const tasks = [makeTask({ status: 'pending' }), makeTask({ name: 'B', status: 'pending' })]
    const result = updateAtPath(tasks, [], 0, (t) => ({ ...t, status: 'done' }))
    expect(result[0].status).toBe('done')
  })

  it('leaves non-target tasks unchanged when path is empty', () => {
    const tasks = [makeTask({ status: 'pending' }), makeTask({ name: 'B', status: 'pending' })]
    const result = updateAtPath(tasks, [], 0, (t) => ({ ...t, status: 'done' }))
    expect(result[1].status).toBe('pending')
  })

  it('recurses into children when path is non-empty', () => {
    const child = makeTask({ name: 'Child', status: 'pending' })
    const parent = makeTask({
      name: 'Parent',
      taskType: 'pipeline',
      status: 'running',
      children: [child]
    })
    const result = updateAtPath([parent], [0], 0, (t) => ({ ...t, status: 'done' }))
    expect(result[0].children![0].status).toBe('done')
  })

  it('treats undefined children as empty array when recursing', () => {
    const parent = makeTask({ name: 'Parent', taskType: 'pipeline', status: 'running' })
    const result = updateAtPath([parent], [0], 0, (t) => ({ ...t, status: 'done' }))
    expect(result[0].children).toEqual([])
  })
})

// ─── upsertAtPath ────────────────────────────────────────────────────────────

describe('upsertAtPath', () => {
  const fns = {
    updater: (t: TaskState): TaskState => ({ ...t, status: 'running' }),
    creator: (): TaskState => makeTask({ name: 'New', status: 'running' })
  }

  it('applies updater when path is empty and index is within bounds', () => {
    const tasks = [makeTask({ status: 'pending' })]
    const result = upsertAtPath(tasks, [], 0, fns)
    expect(result[0].status).toBe('running')
  })

  it('leaves non-target tasks unchanged when path is empty', () => {
    const tasks = [makeTask({ status: 'pending' }), makeTask({ name: 'B', status: 'pending' })]
    const result = upsertAtPath(tasks, [], 1, fns)
    expect(result[0].status).toBe('pending')
  })

  it('appends creator result when path is empty and index equals tasks length', () => {
    const result = upsertAtPath([], [], 0, fns)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('New')
  })

  it('preserves existing tasks when creator appends', () => {
    const existing = makeTask({ name: 'Existing' })
    const result = upsertAtPath([existing], [], 1, fns)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Existing')
  })

  it('recurses into children when path is non-empty', () => {
    const child = makeTask({ name: 'Child', status: 'pending' })
    const parent = makeTask({
      name: 'Parent',
      taskType: 'pipeline',
      status: 'running',
      children: [child]
    })
    const result = upsertAtPath([parent], [0], 0, fns)
    expect(result[0].children![0].status).toBe('running')
  })
})

// ─── applyResult ─────────────────────────────────────────────────────────────

describe('applyResult', () => {
  let setTasks: ReturnType<typeof vi.fn>
  let setAllLines: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    setTasks = vi.fn()
    setAllLines = vi.fn()
  })

  describe('task_start (non-child taskType)', () => {
    const result: PipelineTaskResult = {
      kind: 'task_start',
      taskPath: [],
      taskIndex: 0,
      name: 'Build',
      taskType: 'agent'
    }

    it('setAllLines updater returns [sep] when prev lines are empty', () => {
      applyResult(result, { setTasks, setAllLines })
      const updater = vi.mocked(setAllLines).mock.calls[0][0] as (p: string[]) => string[]
      expect(updater([])).toEqual(['─── 1. Build [agent] ───'])
    })

    it('setAllLines updater prepends blank line separator when prev lines are non-empty', () => {
      applyResult(result, { setTasks, setAllLines })
      const updater = vi.mocked(setAllLines).mock.calls[0][0] as (p: string[]) => string[]
      expect(updater(['prev'])).toEqual(['prev', '', '─── 1. Build [agent] ───'])
    })

    it('setTasks upsert updater sets existing task to running', () => {
      applyResult(result, { setTasks, setAllLines })
      const updater = vi.mocked(setTasks).mock.calls[0][0] as (p: TaskState[]) => TaskState[]
      const existing: TaskState = { name: 'Build', taskType: 'agent', status: 'pending' }
      expect(updater([existing])[0].status).toBe('running')
    })

    it('setTasks upsert creator appends new task when list is empty', () => {
      applyResult(result, { setTasks, setAllLines })
      const updater = vi.mocked(setTasks).mock.calls[0][0] as (p: TaskState[]) => TaskState[]
      const created = updater([])
      expect(created).toHaveLength(1)
      expect(created[0]).toMatchObject({ name: 'Build', taskType: 'agent', status: 'running' })
    })
  })

  describe('task_start (child taskType)', () => {
    const result: PipelineTaskResult = {
      kind: 'task_start',
      taskPath: [],
      taskIndex: 0,
      name: 'SubTask',
      taskType: 'child'
    }

    it('calls setAllLines (separator is always emitted before the child/non-child branch)', () => {
      applyResult(result, { setTasks, setAllLines })
      expect(setAllLines).toHaveBeenCalledTimes(1)
    })

    it('setTasks updater sets status=running and children=[] on the target task', () => {
      applyResult(result, { setTasks, setAllLines })
      const updater = vi.mocked(setTasks).mock.calls[0][0] as (p: TaskState[]) => TaskState[]
      const existing: TaskState = { name: 'SubTask', taskType: 'child', status: 'pending' }
      const updated = updater([existing])[0]
      expect(updated.status).toBe('running')
      expect(updated.children).toEqual([])
    })
  })

  describe('retry', () => {
    const result: PipelineTaskResult = {
      kind: 'retry',
      taskPath: [],
      taskIndex: 0,
      retryCount: 2,
      maxRetries: 3
    }

    it('setTasks updater sets status=retrying with retryCount and maxRetries', () => {
      applyResult(result, { setTasks, setAllLines })
      const updater = vi.mocked(setTasks).mock.calls[0][0] as (p: TaskState[]) => TaskState[]
      const existing: TaskState = { name: 'A', taskType: 'agent', status: 'running' }
      expect(updater([existing])[0]).toMatchObject({
        status: 'retrying',
        retryCount: 2,
        maxRetries: 3
      })
    })

    it('does not call setAllLines', () => {
      applyResult(result, { setTasks, setAllLines })
      expect(setAllLines).not.toHaveBeenCalled()
    })
  })

  describe('else branch (agent / script / pipeline_end → done)', () => {
    const result: PipelineTaskResult = {
      kind: 'agent',
      taskPath: [],
      taskIndex: 0,
      name: 'A',
      sessionId: 's1',
      response: {} as never,
      action: 'started'
    }

    it('setTasks updater sets status=done', () => {
      applyResult(result, { setTasks, setAllLines })
      const updater = vi.mocked(setTasks).mock.calls[0][0] as (p: TaskState[]) => TaskState[]
      const existing: TaskState = { name: 'A', taskType: 'agent', status: 'running' }
      expect(updater([existing])[0].status).toBe('done')
    })

    it('does not call setAllLines', () => {
      applyResult(result, { setTasks, setAllLines })
      expect(setAllLines).not.toHaveBeenCalled()
    })
  })
})

// ─── runPipeline ─────────────────────────────────────────────────────────────

describe('runPipeline', () => {
  let setTasks: ReturnType<typeof vi.fn>
  let setAllLines: ReturnType<typeof vi.fn>
  let setDone: ReturnType<typeof vi.fn>
  let setError: ReturnType<typeof vi.fn>
  let onDone: ReturnType<typeof vi.fn>
  let onError: ReturnType<typeof vi.fn>
  let mockRun: ReturnType<typeof vi.fn>

  const pipeline = { tasks: [] }
  const runOptions = {}

  beforeEach(() => {
    vi.clearAllMocks()
    setTasks = vi.fn()
    setAllLines = vi.fn()
    setDone = vi.fn()
    setError = vi.fn()
    onDone = vi.fn()
    onError = vi.fn()
    mockRun = vi.fn()
  })

  function makeConfig(): Parameters<typeof runPipeline>[0] {
    return {
      pipelineService: { run: mockRun } as never,
      pipeline: pipeline as never,
      runOptions: runOptions as never
    }
  }

  function makeHandlers(): Parameters<typeof runPipeline>[1] {
    return {
      setters: { setTasks, setAllLines, setDone, setError } as never,
      callbacks: { onDone, onError }
    }
  }

  it('calls setDone(true) after empty generator completes', async () => {
    mockRun.mockReturnValue(makeGen<PipelineTaskResult>())
    await runPipeline(makeConfig(), makeHandlers())
    expect(setDone).toHaveBeenCalledWith(true)
  })

  it('calls onDone after empty generator completes', async () => {
    mockRun.mockReturnValue(makeGen<PipelineTaskResult>())
    await runPipeline(makeConfig(), makeHandlers())
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('processes all yielded results before completing', async () => {
    const result: PipelineTaskResult = {
      kind: 'task_start',
      taskPath: [],
      taskIndex: 0,
      name: 'T',
      taskType: 'agent'
    }
    mockRun.mockReturnValue(makeGen(result))
    await runPipeline(makeConfig(), makeHandlers())
    expect(setAllLines).toHaveBeenCalled()
    expect(setDone).toHaveBeenCalledWith(true)
  })

  it('calls setError with error.message when an Error is thrown', async () => {
    const err = new Error('pipeline failed')
    mockRun.mockReturnValue(makeThrowingGen<PipelineTaskResult>(err))
    await runPipeline(makeConfig(), makeHandlers())
    expect(setError).toHaveBeenCalledWith('pipeline failed')
  })

  it('calls onError with the original Error instance when an Error is thrown', async () => {
    const err = new Error('pipeline failed')
    mockRun.mockReturnValue(makeThrowingGen<PipelineTaskResult>(err))
    await runPipeline(makeConfig(), makeHandlers())
    expect(onError).toHaveBeenCalledWith(err)
  })

  it('calls setError with String(value) when a non-Error value is thrown', async () => {
    mockRun.mockReturnValue(makeThrowingGen<PipelineTaskResult>('raw string'))
    await runPipeline(makeConfig(), makeHandlers())
    expect(setError).toHaveBeenCalledWith('raw string')
  })

  it('calls onError with an Error instance when a non-Error value is thrown', async () => {
    mockRun.mockReturnValue(makeThrowingGen<PipelineTaskResult>('raw string'))
    await runPipeline(makeConfig(), makeHandlers())
    expect(vi.mocked(onError).mock.calls[0][0]).toBeInstanceOf(Error)
  })

  it('onError Error has the correct message when a non-Error value is thrown', async () => {
    mockRun.mockReturnValue(makeThrowingGen<PipelineTaskResult>('raw string'))
    await runPipeline(makeConfig(), makeHandlers())
    expect((vi.mocked(onError).mock.calls[0][0] as Error).message).toBe('raw string')
  })

  it('does not call setDone when an error is thrown', async () => {
    mockRun.mockReturnValue(makeThrowingGen<PipelineTaskResult>(new Error('oops')))
    await runPipeline(makeConfig(), makeHandlers())
    expect(setDone).not.toHaveBeenCalled()
  })

  it('does not call onDone when an error is thrown', async () => {
    mockRun.mockReturnValue(makeThrowingGen<PipelineTaskResult>(new Error('oops')))
    await runPipeline(makeConfig(), makeHandlers())
    expect(onDone).not.toHaveBeenCalled()
  })
})

// ─── usePipelineRun hook ──────────────────────────────────────────────────────

describe('usePipelineRun', () => {
  type HookProps = Parameters<typeof usePipelineRun>[0]

  function makeHookProps(overrides: Partial<HookProps> = {}): HookProps {
    return {
      pipeline: { tasks: [] } as never,
      options: {} as never,
      pipelineService: { run: vi.fn().mockReturnValue(makeGen<PipelineTaskResult>()) } as never,
      panelWidth: 80,
      signal: {} as AbortSignal,
      onDone: vi.fn(),
      onError: vi.fn(),
      ...overrides
    }
  }

  const mockSetTasks = vi.fn()
  const mockSetAllLines = vi.fn()
  const mockSetDone = vi.fn()
  const mockSetError = vi.fn()
  const mockTasks: TaskState[] = [{ name: 'T', taskType: 'agent', status: 'pending' }]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useState)
      .mockReturnValueOnce([mockTasks, mockSetTasks] as never)
      .mockReturnValueOnce([[], mockSetAllLines] as never)
      .mockReturnValueOnce([false, mockSetDone] as never)
      .mockReturnValueOnce([null, mockSetError] as never)
    vi.mocked(useEffect).mockImplementation(() => {})
  })

  it('returns tasks from the first useState call on initial render', () => {
    expect(usePipelineRun(makeHookProps()).tasks).toBe(mockTasks)
  })

  it('returns empty allLines on initial render', () => {
    expect(usePipelineRun(makeHookProps()).allLines).toEqual([])
  })

  it('returns done=false on initial render', () => {
    expect(usePipelineRun(makeHookProps()).done).toBe(false)
  })

  it('returns error=null on initial render', () => {
    expect(usePipelineRun(makeHookProps()).error).toBeNull()
  })

  it('calls pipelineService.run on mount with the provided pipeline', () => {
    const mockService = { run: vi.fn().mockReturnValue(makeGen<PipelineTaskResult>()) }
    const props = makeHookProps({ pipelineService: mockService as never })
    let effectCb: (() => void) | undefined
    vi.mocked(useEffect).mockImplementation((cb) => {
      effectCb = cb as () => void
    })
    usePipelineRun(props)
    effectCb?.()
    expect(mockService.run).toHaveBeenCalledWith(props.pipeline, expect.any(Object), undefined)
  })

  it('merges signal into runOptions passed to pipelineService.run', () => {
    const mockSignal = {} as AbortSignal
    const mockService = { run: vi.fn().mockReturnValue(makeGen<PipelineTaskResult>()) }
    const props = makeHookProps({ pipelineService: mockService as never, signal: mockSignal })
    let effectCb: (() => void) | undefined
    vi.mocked(useEffect).mockImplementation((cb) => {
      effectCb = cb as () => void
    })
    usePipelineRun(props)
    effectCb?.()
    const calledOptions = vi.mocked(mockService.run).mock.calls[0][1] as Record<string, unknown>
    expect(calledOptions.signal).toBe(mockSignal)
  })

  it('includes an onStreamEvent callback in the runOptions passed to pipelineService.run', () => {
    const mockService = { run: vi.fn().mockReturnValue(makeGen<PipelineTaskResult>()) }
    const props = makeHookProps({ pipelineService: mockService as never })
    let effectCb: (() => void) | undefined
    vi.mocked(useEffect).mockImplementation((cb) => {
      effectCb = cb as () => void
    })
    usePipelineRun(props)
    effectCb?.()
    const calledOptions = vi.mocked(mockService.run).mock.calls[0][1] as Record<string, unknown>
    expect(calledOptions.onStreamEvent).toBeTypeOf('function')
  })
})
