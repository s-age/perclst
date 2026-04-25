import { useState, useEffect } from 'react'
import type { PipelineService, PipelineRunOptions } from '@src/services/pipelineService.js'
import type { Pipeline } from '@src/types/pipeline.js'
import type { AgentStreamEvent } from '@src/types/agent.js'
import { initTasks, formatStreamLines, appendCappedLines, MAX_ALL_LINES } from './utils.js'
import type { TaskState } from './types.js'

type Props = {
  pipeline: Pipeline
  options: PipelineRunOptions
  pipelineService: PipelineService
  panelWidth: number
  signal: AbortSignal
  onDone: () => void
  onError: (err: Error) => void
}

type Setters = {
  setTasks: (fn: (prev: TaskState[]) => TaskState[]) => void
  setAllLines: (fn: (prev: string[]) => string[]) => void
  setDone: (v: boolean) => void
  setError: (v: string | null) => void
}

function taskSep(
  taskPath: number[],
  index: number,
  name: string | undefined,
  type: string
): string {
  const prefix = taskPath.length > 0 ? taskPath.map((p) => p + 1).join('.') + '.' : ''
  const num = `${prefix}${index + 1}`
  return name ? `─── ${num}. ${name} [${type}] ───` : `─── task ${num} [${type}] ───`
}

function updateAtPath(
  tasks: TaskState[],
  path: number[],
  index: number,
  updater: (t: TaskState) => TaskState
): TaskState[] {
  if (path.length === 0) {
    return tasks.map((t, i) => (i === index ? updater(t) : t))
  }
  const [head, ...rest] = path
  return tasks.map((t, i) =>
    i === head ? { ...t, children: updateAtPath(t.children ?? [], rest, index, updater) } : t
  )
}

type UpsertFns = { updater: (t: TaskState) => TaskState; creator: () => TaskState }

function upsertAtPath(
  tasks: TaskState[],
  path: number[],
  index: number,
  fns: UpsertFns
): TaskState[] {
  if (path.length === 0) {
    if (index < tasks.length) {
      return tasks.map((t, i) => (i === index ? fns.updater(t) : t))
    }
    const next = [...tasks]
    next.push(fns.creator())
    return next
  }
  const [head, ...rest] = path
  return tasks.map((t, i) =>
    i === head ? { ...t, children: upsertAtPath(t.children ?? [], rest, index, fns) } : t
  )
}

type PipelineResult =
  Awaited<ReturnType<PipelineService['run']>> extends AsyncGenerator<infer T> ? T : never

function applyResult(
  result: PipelineResult,
  { setTasks, setAllLines }: Pick<Setters, 'setTasks' | 'setAllLines'>
): void {
  if (result.kind === 'task_start') {
    const sep = taskSep(result.taskPath, result.taskIndex, result.name, result.taskType)
    setAllLines((prev) => (prev.length > 0 ? [...prev, '', sep] : [sep]))
    if (result.taskType === 'child') {
      setTasks((prev) =>
        updateAtPath(prev, result.taskPath, result.taskIndex, (t) => ({
          ...t,
          status: 'running',
          children: []
        }))
      )
    } else {
      setTasks((prev) =>
        upsertAtPath(prev, result.taskPath, result.taskIndex, {
          updater: (t) => ({ ...t, status: 'running' }),
          creator: () => ({
            name: result.name,
            taskType: result.taskType,
            status: 'running' as const
          })
        })
      )
    }
  } else if (result.kind === 'retry') {
    setTasks((prev) =>
      updateAtPath(prev, result.taskPath, result.taskIndex, (t) => ({
        ...t,
        status: 'retrying',
        retryCount: result.retryCount,
        maxRetries: result.maxRetries
      }))
    )
  } else {
    setTasks((prev) =>
      updateAtPath(prev, result.taskPath, result.taskIndex, (t) => ({ ...t, status: 'done' }))
    )
  }
}

type RunPipelineConfig = {
  pipelineService: PipelineService
  pipeline: Pipeline
  runOptions: PipelineRunOptions
}

type RunPipelineHandlers = {
  setters: Setters
  callbacks: { onDone: () => void; onError: (err: Error) => void }
}

async function runPipeline(
  config: RunPipelineConfig,
  handlers: RunPipelineHandlers
): Promise<void> {
  try {
    for await (const result of config.pipelineService.run(
      config.pipeline,
      config.runOptions,
      undefined as never
    )) {
      applyResult(result, handlers.setters)
    }
    handlers.setters.setDone(true)
    handlers.callbacks.onDone()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    handlers.setters.setError(msg)
    handlers.callbacks.onError(err instanceof Error ? err : new Error(msg))
  }
}

export function usePipelineRun({
  pipeline,
  options,
  pipelineService,
  panelWidth,
  signal,
  onDone,
  onError
}: Props): { tasks: TaskState[]; allLines: string[]; done: boolean; error: string | null } {
  const [tasks, setTasks] = useState<TaskState[]>(() => initTasks(pipeline))
  const [allLines, setAllLines] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onStreamEvent = (event: AgentStreamEvent): void => {
      const lines = formatStreamLines(event, panelWidth)
      setAllLines((prev) => appendCappedLines(prev, lines, MAX_ALL_LINES))
    }
    const runOptions: PipelineRunOptions = { ...options, onStreamEvent, signal }
    void runPipeline(
      { pipelineService, pipeline, runOptions },
      { setters: { setTasks, setAllLines, setDone, setError }, callbacks: { onDone, onError } }
    )
  }, [])

  return { tasks, allLines, done, error }
}
