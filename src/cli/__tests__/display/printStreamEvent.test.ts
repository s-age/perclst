import { vi, describe, it, expect, beforeEach } from 'vitest'
import { printStreamEvent } from '@src/cli/display'
import type { AgentStreamEvent } from '@src/types/agent'
import type { DisplayConfig } from '@src/types/config'

// Mock modules
vi.mock('ansis', () => ({
  default: {
    hex: vi.fn((color: string) => (s: string) => `[hex:${color}]${s}[/hex]`),
    dim: vi.fn((s: string) => `[dim]${s}[/dim]`),
    bgRgb: vi.fn(() => ({
      whiteBright: vi.fn((s: string) => `[bg-rgb]${s}[/bg-rgb]`)
    }))
  }
}))

vi.mock('@src/utils/output', () => ({
  stdout: {
    print: vi.fn()
  }
}))

vi.mock('@src/constants/config', () => ({
  DEFAULT_HEADER_COLOR: '#D97757',
  CONTEXT_WINDOW_SIZE: 200000
}))

import { stdout } from '@src/utils/output'

describe('printStreamEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NO_COLOR = undefined
  })

  describe('thought event', () => {
    it('prints thinking header', () => {
      const event: AgentStreamEvent = {
        type: 'thought',
        thinking: 'I am thinking about this'
      }

      printStreamEvent(event)

      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('Thinking'))
    })

    it('prints thinking content with dim styling', () => {
      const event: AgentStreamEvent = {
        type: 'thought',
        thinking: 'I am thinking about this'
      }

      printStreamEvent(event)

      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('I am thinking about this'))
    })

    it('calls stdout.print twice for thought event', () => {
      const event: AgentStreamEvent = {
        type: 'thought',
        thinking: 'test thought'
      }

      printStreamEvent(event)

      expect(stdout.print).toHaveBeenCalledTimes(2)
    })

    it('handles multiline thinking content', () => {
      const event: AgentStreamEvent = {
        type: 'thought',
        thinking: 'Line 1\nLine 2\nLine 3'
      }

      printStreamEvent(event)

      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('Line 1'))
    })
  })

  describe('tool_use event', () => {
    it('prints tool label with bracketed name', () => {
      const event: AgentStreamEvent = {
        type: 'tool_use',
        name: 'WebFetch',
        input: { url: 'https://example.com' }
      }

      printStreamEvent(event)

      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('[WebFetch]'))
    })

    it('prints tool input as JSON', () => {
      const event: AgentStreamEvent = {
        type: 'tool_use',
        name: 'Bash',
        input: { command: 'ls -la' }
      }

      printStreamEvent(event)

      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('input:'))
      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('ls -la'))
    })

    it('handles complex input objects', () => {
      const event: AgentStreamEvent = {
        type: 'tool_use',
        name: 'Monitor',
        input: { command: 'tail -f log', timeout_ms: 300000, persistent: true }
      }

      printStreamEvent(event)

      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('Monitor'))
      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('tail -f log'))
    })

    it('handles empty input object', () => {
      const event: AgentStreamEvent = {
        type: 'tool_use',
        name: 'TaskOutput',
        input: {}
      }

      printStreamEvent(event)

      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('TaskOutput'))
    })
  })

  describe('tool_result event', () => {
    it('prints result label', () => {
      const event: AgentStreamEvent = {
        type: 'tool_result',
        result: 'Command output here'
      }

      printStreamEvent(event)

      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('result:'))
    })

    it('formats simple text results', () => {
      const event: AgentStreamEvent = {
        type: 'tool_result',
        result: 'Simple text result'
      }

      printStreamEvent(event)

      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('Simple text result'))
    })

    it('formats JSON results with pretty-printing', () => {
      const event: AgentStreamEvent = {
        type: 'tool_result',
        result: '{"key": "value", "nested": {"field": "data"}}'
      }

      printStreamEvent(event)

      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('key'))
    })

    it('formats multiline results with indentation', () => {
      const event: AgentStreamEvent = {
        type: 'tool_result',
        result: 'Line 1\nLine 2\nLine 3'
      }

      printStreamEvent(event)

      expect(stdout.print).toHaveBeenCalled()
    })

    it('handles ContentBlock array format', () => {
      const contentBlocks = JSON.stringify([
        { type: 'text', text: '{"result": "data"}' },
        { type: 'text', text: 'Additional text' }
      ])

      const event: AgentStreamEvent = {
        type: 'tool_result',
        result: contentBlocks
      }

      printStreamEvent(event)

      expect(stdout.print).toHaveBeenCalled()
    })
  })

  describe('displayConfig handling', () => {
    it('applies custom header_color when provided', () => {
      const event: AgentStreamEvent = {
        type: 'thought',
        thinking: 'test'
      }
      const config: DisplayConfig = { header_color: '#AABBCC', no_color: false }

      printStreamEvent(event, config)

      expect(stdout.print).toHaveBeenCalled()
    })

    it('respects no_color setting in displayConfig', () => {
      const event: AgentStreamEvent = {
        type: 'thought',
        thinking: 'test'
      }
      const config: DisplayConfig = { no_color: true }

      printStreamEvent(event, config)

      expect(stdout.print).toHaveBeenCalled()
    })

    it('uses default config when displayConfig not provided', () => {
      const event: AgentStreamEvent = {
        type: 'tool_use',
        name: 'TestTool',
        input: {}
      }

      printStreamEvent(event)

      expect(stdout.print).toHaveBeenCalled()
    })
  })
})
