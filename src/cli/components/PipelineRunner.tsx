import React, { useEffect, useState } from 'react'
import { Box, Text } from 'ink'
import { TaskRow } from '@src/cli/components/TaskRow.js'
import type { PipelineService, PipelineRunOptions } from '@src/services/pipelineService.js'
import type { Pipeline } from '@src/types/pipeline.js'
import type { Config } from '@src/types/config.js'
import type { AgentStreamEvent } from '@src/types/agent.js'

type TaskState = {
  name?: string
  taskType: 'agent' | 'script' | 'pipeline'
  status: 'pending' | 'running' | 'done' | 'failed' | 'retrying'
  retryCount?: number
  maxRetries?: number
}

type PipelineRunnerProps = {
  pipeline: Pipeline
  options: PipelineRunOptions
  pipelineService: PipelineService
  config: Config
  onDone: () => void
  onError: (err: Error) => void
}

const MAX_STREAM_LINES = 15

// eslint-disable-next-line max-lines-per-function
export function PipelineRunner({
  pipeline,
  options,
  pipelineService,
  onDone,
  onError
}: PipelineRunnerProps) {
  const [tasks, setTasks] = useState<TaskState[]>([])
  const [streamLines, setStreamLines] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // eslint-disable-next-line max-lines-per-function
  useEffect(() => {
    const onStreamEvent = (event: AgentStreamEvent) => {
      let line: string
      if (event.type === 'thought') {
        line = `[thought] ${event.thinking.slice(0, 120)}`
      } else if (event.type === 'tool_use') {
        line = `[tool] ${event.name}`
      } else {
        line = `[result] ${event.toolName}`
      }
      setStreamLines((prev) => [...prev.slice(-(MAX_STREAM_LINES - 1)), line])
    }

    const runOptions: PipelineRunOptions = { ...options, onStreamEvent }

    async function run() {
      try {
        for await (const result of pipelineService.run(pipeline, runOptions, undefined as never)) {
          switch (result.kind) {
            case 'task_start':
              setTasks((prev) => [
                ...prev,
                { name: result.name, taskType: result.taskType, status: 'running' }
              ])
              break
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
        setStreamLines([])
        setDone(true)
        onDone()
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
        onError(err instanceof Error ? err : new Error(msg))
      }
    }

    void run()
  }, [])

  return (
    <Box flexDirection="column">
      <Text bold>Running pipeline — {pipeline.tasks.length} task(s)</Text>
      {tasks.map((task, i) => (
        <TaskRow
          key={i}
          name={task.name}
          taskType={task.taskType}
          status={task.status}
          retryCount={task.retryCount}
          maxRetries={task.maxRetries}
        />
      ))}
      {!done && streamLines.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          {streamLines.map((line, i) => (
            <Text key={i} color="gray">
              {line}
            </Text>
          ))}
        </Box>
      )}
      {done && <Text color="green">Pipeline complete.</Text>}
      {error !== null && <Text color="red">Pipeline failed: {error}</Text>}
    </Box>
  )
}
