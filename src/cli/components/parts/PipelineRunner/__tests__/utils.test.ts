import { describe, it, expect } from 'vitest'
import type { Pipeline } from '@src/types/pipeline'
import type { AgentStreamEvent } from '@src/types/agent'
import {
  initTasks,
  splitToLines,
  formatStreamLines,
  appendCappedLines,
  formatInputSummary,
  SPINNER_INTERVAL_MS,
  PERM_PANEL_ROWS,
  STREAM_HEADER_ROWS,
  MAX_ALL_LINES
} from '../utils.js'

describe('PipelineRunner/utils', () => {
  describe('initTasks', () => {
    it('maps agent task with done=false to pending status', () => {
      const pipeline: Pipeline = {
        tasks: [{ type: 'agent', name: 'Test Agent', task: 'test-task', done: false }]
      }
      const result = initTasks(pipeline)
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        name: 'Test Agent',
        taskType: 'agent',
        status: 'pending',
        command: undefined,
        children: undefined
      })
    })

    it('maps agent task with done=true to done status', () => {
      const pipeline: Pipeline = {
        tasks: [{ type: 'agent', name: 'Test Agent', task: 'test-task', done: true }]
      }
      const result = initTasks(pipeline)
      expect(result[0]).toMatchObject({
        status: 'done'
      })
    })

    it('maps script task with command and no name', () => {
      const pipeline: Pipeline = {
        tasks: [{ type: 'script', command: 'npm run build', done: false }]
      }
      const result = initTasks(pipeline)
      expect(result[0]).toMatchObject({
        name: undefined,
        command: 'npm run build',
        taskType: 'script',
        status: 'pending'
      })
    })

    it('recursively processes nested pipeline tasks', () => {
      const pipeline: Pipeline = {
        tasks: [
          {
            type: 'pipeline',
            name: 'Parent',
            tasks: [{ type: 'agent', name: 'Child', task: 'child-task', done: false }],
            done: false
          }
        ]
      }
      const result = initTasks(pipeline)
      expect(result[0]).toMatchObject({
        name: 'Parent',
        taskType: 'pipeline',
        command: undefined
      })
      expect(result[0].children).toHaveLength(1)
      expect(result[0].children?.[0]).toMatchObject({
        name: 'Child',
        taskType: 'agent'
      })
    })

    it('handles empty task array', () => {
      const pipeline: Pipeline = { tasks: [] }
      const result = initTasks(pipeline)
      expect(result).toEqual([])
    })
  })

  describe('splitToLines', () => {
    it('splits text across lines with correct width and prefix', () => {
      const result = splitToLines('abcdefghijklmnop', 5, '  ')
      expect(result).toEqual(['  abcde', '  fghij', '  klmno', '  p'])
    })

    it('returns only prefix when text is empty', () => {
      const result = splitToLines('', 10, '  ')
      expect(result).toEqual(['  '])
    })

    it('handles text exactly matching width', () => {
      const result = splitToLines('abcde', 5, '')
      expect(result).toEqual(['abcde'])
    })
  })

  describe('formatStreamLines', () => {
    it('formats thought event by trimming and normalizing whitespace', () => {
      const event: AgentStreamEvent = {
        type: 'thought',
        thinking: '  Multiple   spaces   here  \n\n  with newlines  '
      }
      const result = formatStreamLines(event, 20)
      // Text becomes "Multiple spaces here with newlines" (34 chars) after trim+normalize
      // Split at width 20: ["Multiple spaces here", " with newlines"]
      expect(result).toEqual(['  Multiple spaces here', '   with newlines'])
    })

    it('splits thought text across lines when exceeding width', () => {
      const event: AgentStreamEvent = {
        type: 'thought',
        thinking: 'abcdefghijklmnopqrst'
      }
      const result = formatStreamLines(event, 10)
      expect(result).toEqual(['  abcdefghij', '  klmnopqrst'])
    })

    it('formats tool_use event with tool name', () => {
      const event: AgentStreamEvent = {
        type: 'tool_use',
        name: 'WebFetch',
        input: {}
      }
      const result = formatStreamLines(event, 80)
      expect(result).toEqual(['  → WebFetch'])
    })

    it('formats tool_result event with toolName header and result lines', () => {
      const event: AgentStreamEvent = {
        type: 'tool_result',
        toolName: 'Bash',
        result: 'Success result text'
      }
      const result = formatStreamLines(event, 80)
      expect(result[0]).toBe('  ← Bash')
      expect(result[1]).toBe('    Success result text')
    })

    it('returns only header when tool result is empty after trim', () => {
      const event: AgentStreamEvent = {
        type: 'tool_result',
        toolName: 'Read',
        result: '   \n\n   '
      }
      const result = formatStreamLines(event, 80)
      expect(result).toEqual(['  ← Read'])
    })
  })

  describe('appendCappedLines', () => {
    it('returns all lines when combined count is within cap', () => {
      expect(appendCappedLines(['a', 'b'], ['c'], 5)).toEqual(['a', 'b', 'c'])
    })

    it('slices to the last max entries when combined count exceeds cap', () => {
      expect(appendCappedLines(['a', 'b', 'c'], ['d', 'e'], 3)).toEqual(['c', 'd', 'e'])
    })
  })

  describe('formatInputSummary', () => {
    it('returns command value when present', () => {
      const input = { command: 'npm install' }
      expect(formatInputSummary(input)).toBe('npm install')
    })

    it('prioritizes command over file_path', () => {
      const input = { command: 'cmd value', file_path: 'file.ts' }
      expect(formatInputSummary(input)).toBe('cmd value')
    })

    it('returns file_path when command is undefined', () => {
      const input = { file_path: '/home/user/file.ts' }
      expect(formatInputSummary(input)).toBe('/home/user/file.ts')
    })

    it('prioritizes file_path over path', () => {
      const input = { file_path: 'file1.ts', path: '/some/path' }
      expect(formatInputSummary(input)).toBe('file1.ts')
    })

    it('returns path when command and file_path are undefined', () => {
      const input = { path: '/system/path' }
      expect(formatInputSummary(input)).toBe('/system/path')
    })

    it('prioritizes path over url', () => {
      const input = { path: '/path', url: 'https://example.com' }
      expect(formatInputSummary(input)).toBe('/path')
    })

    it('returns url when higher-priority fields are undefined', () => {
      const input = { url: 'https://example.com' }
      expect(formatInputSummary(input)).toBe('https://example.com')
    })

    it('prioritizes url over pattern', () => {
      const input = { url: 'https://example.com', pattern: '*.ts' }
      expect(formatInputSummary(input)).toBe('https://example.com')
    })

    it('returns pattern when all higher-priority fields are undefined', () => {
      const input = { pattern: '**/*.test.ts' }
      expect(formatInputSummary(input)).toBe('**/*.test.ts')
    })

    it('returns stringified JSON when all priority fields are undefined', () => {
      const input = { other: 'value', nested: { prop: 123 } }
      const result = formatInputSummary(input)
      expect(result).toContain('"other"')
      expect(result).toContain('"nested"')
    })

    it('truncates JSON string to 120 characters', () => {
      const input = { data: 'x'.repeat(200) }
      const result = formatInputSummary(input)
      expect(result).toHaveLength(120)
    })
  })

  describe('exported constants', () => {
    it('exports SPINNER_INTERVAL_MS as 300', () => {
      expect(SPINNER_INTERVAL_MS).toBe(300)
    })

    it('exports PERM_PANEL_ROWS as 8', () => {
      expect(PERM_PANEL_ROWS).toBe(8)
    })

    it('exports STREAM_HEADER_ROWS as 3', () => {
      expect(STREAM_HEADER_ROWS).toBe(3)
    })

    it('exports MAX_ALL_LINES as 5000', () => {
      expect(MAX_ALL_LINES).toBe(5000)
    })
  })
})
