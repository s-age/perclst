import type { AgentStreamEvent } from '@src/types/agent.js'
import type { Pipeline } from '@src/types/pipeline.js'
import type { TaskState } from './types.js'

export const SPINNER_INTERVAL_MS = 300
export const PERM_PANEL_ROWS = 8
// rows reserved in right panel: header(1) + blank(1) + status(1)
export const STREAM_HEADER_ROWS = 3
export const MAX_ALL_LINES = 5000

export function initTasks(pipeline: Pipeline): TaskState[] {
  return pipeline.tasks.map((t) => ({
    name: t.type !== 'script' ? t.name : undefined,
    command: t.type === 'script' ? t.command : undefined,
    taskType: t.type,
    status: (t.done ? 'done' : 'pending') as TaskState['status'],
    children: t.type === 'pipeline' ? initTasks({ tasks: t.tasks }) : undefined
  }))
}

/** @internal exported for testing only */
export function splitToLines(text: string, width: number, prefix: string): string[] {
  const lines: string[] = []
  for (let i = 0; i < text.length; i += width) {
    lines.push(`${prefix}${text.slice(i, i + width)}`)
  }
  return lines.length > 0 ? lines : [prefix]
}

// Max chars to process per event before trimming — 3 display lines is plenty
const MAX_STREAM_INPUT = 600

export function formatStreamLines(event: AgentStreamEvent, lineWidth: number): string[] {
  if (event.type === 'thought') {
    const raw =
      event.thinking.length > MAX_STREAM_INPUT
        ? event.thinking.slice(0, MAX_STREAM_INPUT)
        : event.thinking
    const text = raw.trim().replace(/\s+/g, ' ')
    return splitToLines(text, lineWidth, '  ')
  }
  if (event.type === 'tool_use') {
    return [`  → ${event.name}`]
  }
  const raw =
    event.result.length > MAX_STREAM_INPUT ? event.result.slice(0, MAX_STREAM_INPUT) : event.result
  const result = raw.trim().replace(/\s+/g, ' ')
  const header = `  ← ${event.toolName}`
  if (!result) return [header]
  return [header, ...splitToLines(result, lineWidth - 4, '    ').slice(0, 3)]
}

export function appendCappedLines(prev: string[], lines: string[], max: number): string[] {
  const next = [...prev, ...lines]
  return next.length > max ? next.slice(-max) : next
}

export function formatInputSummary(input: Record<string, unknown>): string {
  const primary = input.command ?? input.file_path ?? input.path ?? input.url ?? input.pattern
  if (primary !== undefined) return String(primary)
  return JSON.stringify(input).slice(0, 120)
}
