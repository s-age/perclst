import { useState, useEffect } from 'react'
import type { PipelineService, PipelineRunOptions } from '@src/services/pipelineService.js'
import type { Pipeline } from '@src/types/pipeline.js'
import type { AgentStreamEvent } from '@src/types/agent.js'
import { initTasks, formatStreamLines, MAX_ALL_LINES } from './utils.js'
import type { TaskState } from './types.js'

type Props = {
  pipeline: Pipeline
  options: PipelineRunOptions
  pipelineService: PipelineService
  panelWidth: number
  onDone: () => void
  onError: (err: Error) => void
}

type Setters = {
  setTasks: (fn: (prev: TaskState[]) => TaskState[]) => void
  setAllLines: (fn: (prev: string[]) => string[]) => void
  setDone: (v: boolean) => void
  setError: (v: string | null) => void
}

function taskSep(index: number, name: string | undefined, type: string): string {
  return name ? `─── ${index + 1}. ${name} [${type}] ───` : `─── task ${index + 1} [${type}] ───`
}

async function runPipeline(
  pipelineService: PipelineService,
  pipeline: Pipeline,
  runOptions: PipelineRunOptions,
  { setTasks, setAllLines, setDone, setError }: Setters,
  onDone: () => void,
  onError: (err: Error) => void
): Promise<void> {
  try {
    for await (const result of pipelineService.run(pipeline, runOptions, undefined as never)) {
      switch (result.kind) {
        case 'task_start': {
          const sep = taskSep(result.taskIndex, result.name, result.taskType)
          setAllLines((prev) => (prev.length > 0 ? [...prev, '', sep] : [sep]))
          setTasks((prev) =>
            prev.map((t, i) => (i === result.taskIndex ? { ...t, status: 'running' } : t))
          )
          break
        }
        case 'retry':
          setTasks((prev) =>
            prev.map((t, i) =>
              i === result.taskIndex
                ? {
                    ...t,
                    status: 'retrying',
                    retryCount: result.retryCount,
                    maxRetries: result.maxRetries
                  }
                : t
            )
          )
          break
        case 'agent':
        case 'script':
          setTasks((prev) =>
            prev.map((t, i) => (i === result.taskIndex ? { ...t, status: 'done' } : t))
          )
          break
      }
    }
    setDone(true)
    onDone()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    setError(msg)
    onError(err instanceof Error ? err : new Error(msg))
  }
}

export function usePipelineRun({
  pipeline,
  options,
  pipelineService,
  panelWidth,
  onDone,
  onError
}: Props) {
  const [tasks, setTasks] = useState<TaskState[]>(() => initTasks(pipeline))
  const [allLines, setAllLines] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onStreamEvent = (event: AgentStreamEvent) => {
      const lines = formatStreamLines(event, panelWidth)
      setAllLines((prev) => {
        const next = [...prev, ...lines]
        return next.length > MAX_ALL_LINES ? next.slice(-MAX_ALL_LINES) : next
      })
    }
    const runOptions: PipelineRunOptions = { ...options, onStreamEvent }
    void runPipeline(
      pipelineService,
      pipeline,
      runOptions,
      { setTasks, setAllLines, setDone, setError },
      onDone,
      onError
    )
  }, [])

  return { tasks, allLines, done, error }
}
