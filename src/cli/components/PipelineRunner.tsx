import React, { useEffect, useState } from 'react'
import { Box, Text, useStdout, useInput } from 'ink'
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
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

type PermissionRequest = {
  tool_name: string
  input: Record<string, unknown>
}

type PermissionResult =
  | { behavior: 'allow'; updatedInput: Record<string, unknown> }
  | { behavior: 'deny'; message: string }

type PipelineRunnerProps = {
  pipeline: Pipeline
  options: PipelineRunOptions
  pipelineService: PipelineService
  config: Config
  onDone: () => void
  onError: (err: Error) => void
}

const SPINNER_INTERVAL_MS = 80
const PERM_PANEL_ROWS = 8
// rows reserved in right panel: header(1) + blank(1) + status(1)
const STREAM_HEADER_ROWS = 3
const MAX_ALL_LINES = 5000

function initTasks(pipeline: Pipeline): TaskState[] {
  return pipeline.tasks.map((t) => ({
    name: t.type !== 'script' ? t.name : undefined,
    command: t.type === 'script' ? t.command : undefined,
    taskType: t.type,
    status: 'pending' as const
  }))
}

function splitToLines(text: string, width: number, prefix: string): string[] {
  const lines: string[] = []
  for (let i = 0; i < text.length; i += width) {
    lines.push(`${prefix}${text.slice(i, i + width)}`)
  }
  return lines.length > 0 ? lines : [prefix]
}

function formatStreamLines(event: AgentStreamEvent, lineWidth: number): string[] {
  if (event.type === 'thought') {
    const text = event.thinking.trim().replace(/\s+/g, ' ')
    return splitToLines(text, lineWidth, '  ')
  }
  if (event.type === 'tool_use') {
    return [`  → ${event.name}`]
  }
  const result = event.result.trim().replace(/\s+/g, ' ')
  const header = `  ← ${event.toolName}`
  if (!result) return [header]
  return [header, ...splitToLines(result, lineWidth - 4, '    ').slice(0, 3)]
}

function formatInputSummary(input: Record<string, unknown>): string {
  const primary = input.command ?? input.file_path ?? input.path ?? input.url ?? input.pattern
  if (primary !== undefined) return String(primary)
  return JSON.stringify(input).slice(0, 120)
}

function respondPermission(pipePath: string, result: PermissionResult): void {
  try {
    writeFileSync(`${pipePath}.res`, JSON.stringify(result), 'utf-8')
  } catch {
    /* ignore */
  }
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
  const mainRows = termRows - PERM_PANEL_ROWS
  // right panel is ~60% minus border(1) and padding(1)
  const panelWidth = Math.max(20, Math.floor((stdout.columns ?? 80) * 0.6) - 6)

  const [tasks, setTasks] = useState<TaskState[]>(() => initTasks(pipeline))
  const [allLines, setAllLines] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [spinnerFrame, setSpinnerFrame] = useState(0)
  const [permRequest, setPermRequest] = useState<PermissionRequest | null>(null)
  // scrollOffset > 0 means scrolled up from bottom (reserved for future Ctrl+O)
  const [scrollOffset] = useState(0)

  const streamCapacity = Math.max(1, mainRows - STREAM_HEADER_ROWS)
  const permPipePath = process.env.PERCLST_PERMISSION_PIPE ?? null

  useEffect(() => {
    const interval = setInterval(() => {
      setSpinnerFrame((f) => f + 1)
    }, SPINNER_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  // Poll for permission requests from MCP server via file IPC
  useEffect(() => {
    if (!permPipePath) return
    const reqPath = `${permPipePath}.req`
    const interval = setInterval(() => {
      if (!existsSync(reqPath)) return
      try {
        const req = JSON.parse(readFileSync(reqPath, 'utf-8')) as PermissionRequest
        try {
          unlinkSync(reqPath)
        } catch {
          /* ignore */
        }
        setPermRequest(req)
      } catch {
        /* ignore */
      }
    }, 100)
    return () => clearInterval(interval)
  }, [permPipePath])

  useInput((input) => {
    if (!permRequest || !permPipePath) return
    const allow = input.toLowerCase() === 'y'
    respondPermission(
      permPipePath,
      allow
        ? { behavior: 'allow', updatedInput: permRequest.input }
        : { behavior: 'deny', message: 'User denied permission' }
    )
    setPermRequest(null)
  })

  useEffect(() => {
    const onStreamEvent = (event: AgentStreamEvent) => {
      const lines = formatStreamLines(event, panelWidth)
      setAllLines((prev) => {
        const next = [...prev, ...lines]
        return next.length > MAX_ALL_LINES ? next.slice(-MAX_ALL_LINES) : next
      })
    }

    const runOptions: PipelineRunOptions = { ...options, onStreamEvent }

    async function run() {
      try {
        for await (const result of pipelineService.run(pipeline, runOptions, undefined as never)) {
          switch (result.kind) {
            case 'task_start': {
              const sep = result.name
                ? `─── ${result.taskIndex + 1}. ${result.name} [${result.taskType}] ───`
                : `─── task ${result.taskIndex + 1} [${result.taskType}] ───`
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

    void run()
  }, [])

  const runningIndex = tasks.findIndex((t) => t.status === 'running' || t.status === 'retrying')
  const viewEnd = scrollOffset > 0 ? allLines.length - scrollOffset : allLines.length
  const viewStart = Math.max(0, viewEnd - streamCapacity)
  const visibleLines = allLines.slice(viewStart, viewEnd)

  return (
    <Box flexDirection="column" height={termRows}>
      {/* Top: left/right split */}
      <Box flexDirection="row" height={mainRows}>
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
          {allLines.length === 0 && !done && !error && <Text color="gray"> waiting...</Text>}
          {visibleLines.map((line, i) => (
            <Text key={i} color={line.startsWith('───') ? 'cyan' : 'gray'} wrap="truncate">
              {line}
            </Text>
          ))}
          {done && <Text color="green"> Pipeline complete.</Text>}
          {error !== null && <Text color="red"> Error: {error}</Text>}
        </Box>
      </Box>

      {/* Bottom: permission panel */}
      <Box
        flexDirection="column"
        height={PERM_PANEL_ROWS}
        borderStyle="single"
        borderLeft={false}
        borderRight={false}
        borderBottom={false}
        paddingX={1}
      >
        <Text bold color={permRequest ? 'yellow' : 'gray'}>
          Permission{permRequest ? ' Request' : ''}
        </Text>
        <Text> </Text>
        {permRequest ? (
          <>
            <Text>
              {' '}
              Tool : <Text color="cyan">{permRequest.tool_name}</Text>
            </Text>
            <Text wrap="truncate"> Input: {formatInputSummary(permRequest.input)}</Text>
            <Text> </Text>
            <Text color="yellow"> Allow? [y/N] </Text>
          </>
        ) : (
          <>
            <Text color="gray"> —</Text>
            <Text> </Text>
            <Text> </Text>
            <Text> </Text>
          </>
        )}
      </Box>
    </Box>
  )
}
