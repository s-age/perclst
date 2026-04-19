import React, { useEffect, useState } from 'react'
import { Box, Text, useStdout } from 'ink'
import { TaskRow } from '@src/cli/components/TaskRow.js'
import type { PipelineService, PipelineRunOptions } from '@src/services/pipelineService.js'
import type { Pipeline } from '@src/types/pipeline.js'
import type { Config } from '@src/types/config.js'
import type { AgentStreamEvent } from '@src/types/agent.js'

type TaskState = {
  name?: string
  command?: string
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

const SPINNER_INTERVAL_MS = 80
// rows reserved: header(1) + blank(1) + status(1)
const STREAM_HEADER_ROWS = 3

function initTasks(pipeline: Pipeline): TaskState[] {
  return pipeline.tasks.map((t) => ({
    name: t.type !== 'script' ? t.name : undefined,
    command: t.type === 'script' ? t.command : undefined,
    taskType: t.type,
    status: 'pending' as const
  }))
}

function formatStreamLine(event: AgentStreamEvent): string {
  if (event.type === 'thought') {
    return `  ${event.thinking.slice(0, 100)}`
  }
  if (event.type === 'tool_use') {
    return `  → ${event.name}`
  }
  return `  ← ${event.toolName}`
}

// eslint-disable-next-line max-lines-per-function
export function PipelineRunner({
  pipeline,
  options,
  pipelineService,
  onDone,
  onError
}: PipelineRunnerProps) {
  const { stdout } = useStdout()
  const termRows = stdout.rows ?? 24

  const [tasks, setTasks] = useState<TaskState[]>(() => initTasks(pipeline))
  const [streamLines, setStreamLines] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [spinnerFrame, setSpinnerFrame] = useState(0)

  const streamCapacity = Math.max(1, termRows - STREAM_HEADER_ROWS)

  useEffect(() => {
    const interval = setInterval(() => {
      setSpinnerFrame((f) => f + 1)
    }, SPINNER_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const onStreamEvent = (event: AgentStreamEvent) => {
      const line = formatStreamLine(event)
      setStreamLines((prev) => [...prev.slice(-(streamCapacity - 1)), line])
    }

    const runOptions: PipelineRunOptions = { ...options, onStreamEvent }

    async function run() {
      try {
        for await (const result of pipelineService.run(pipeline, runOptions, undefined as never)) {
          switch (result.kind) {
            case 'task_start':
              setTasks((prev) =>
                prev.map((t, i) => (i === result.taskIndex ? { ...t, status: 'running' } : t))
              )
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
              setStreamLines([])
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

    void run()
  }, [])

  const runningIndex = tasks.findIndex((t) => t.status === 'running' || t.status === 'retrying')

  return (
    <Box flexDirection="row" height={termRows}>
      {/* Left 40%: Workflow overview */}
      <Box flexDirection="column" width="40%" paddingRight={1}>
        <Text bold>Workflow</Text>
        <Text> </Text>
        {tasks.map((task, i) => (
          <TaskRow
            key={i}
            index={i}
            name={task.name}
            command={task.command}
            taskType={task.taskType}
            status={task.status}
            retryCount={task.retryCount}
            maxRetries={task.maxRetries}
            spinnerFrame={spinnerFrame}
          />
        ))}
        <Text> </Text>
        {done && <Text color="green">✓ Complete ({tasks.length} tasks)</Text>}
        {error !== null && <Text color="red">✗ Failed</Text>}
      </Box>

      {/* Right 60%: Execution output */}
      <Box
        flexDirection="column"
        width="60%"
        borderStyle="single"
        borderTop={false}
        borderBottom={false}
        borderRight={false}
        paddingLeft={1}
      >
        <Text bold>
          Output
          {runningIndex >= 0 && <Text color="gray"> — task {runningIndex + 1}</Text>}
        </Text>
        <Text> </Text>
        {streamLines.length === 0 && !done && !error && <Text color="gray"> waiting...</Text>}
        {streamLines.map((line, i) => (
          <Text key={i} color="gray">
            {line}
          </Text>
        ))}
        {done && <Text color="green"> Pipeline complete.</Text>}
        {error !== null && <Text color="red"> Error: {error}</Text>}
      </Box>
    </Box>
  )
}
