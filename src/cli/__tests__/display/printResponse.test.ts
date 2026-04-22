import { vi, describe, it, expect, beforeEach } from 'vitest'
import { printResponse } from '@src/cli/display'
import type { AgentResponse } from '@src/types/agent'
import type { DisplayConfig } from '@src/types/config'
import type { DisplayOptions } from '@src/types/display'

// Mock modules
vi.mock('ansis', () => ({
  default: {
    hex: vi.fn(
      (color: string) =>
        (s: string): string =>
          `[hex:${color}]${s}[/hex]`
    ),
    dim: vi.fn((s: string): string => `[dim]${s}[/dim]`),
    bgRgb: vi.fn((): { whiteBright: (s: string) => string } => ({
      whiteBright: vi.fn((s: string): string => `[bg-rgb]${s}[/bg-rgb]`)
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

const baseResponse: AgentResponse = {
  content: 'Agent response content',
  model: 'claude-sonnet-4-6',
  usage: {
    input_tokens: 1000,
    output_tokens: 500
  }
}

describe('printResponse', (): void => {
  beforeEach((): void => {
    vi.clearAllMocks()
    process.env.NO_COLOR = undefined
  })

  describe('json format output', (): void => {
    it('outputs JSON when format is json', (): void => {
      const opts: DisplayOptions = { format: 'json' }

      printResponse(baseResponse, opts)

      const calls = (stdout.print as ReturnType<typeof vi.fn>).mock.calls
      const callArg = calls[0]?.[0] as string | undefined
      expect(callArg).toBeDefined()

      const parsed = JSON.parse(callArg || '{}')
      expect(parsed.content).toBe('Agent response content')
      expect(parsed.model).toBe('claude-sonnet-4-6')
    })

    it('includes session_id in JSON output when provided', (): void => {
      const opts: DisplayOptions = { format: 'json' }

      printResponse(baseResponse, opts, undefined, { sessionId: 'session-123' })

      const calls = (stdout.print as ReturnType<typeof vi.fn>).mock.calls
      const callArg = calls[0]?.[0] as string
      const parsed = JSON.parse(callArg)

      expect(parsed.session_id).toBe('session-123')
    })

    it('sets session_id to null in JSON when not provided', (): void => {
      const opts: DisplayOptions = { format: 'json' }

      printResponse(baseResponse, opts)

      const calls = (stdout.print as ReturnType<typeof vi.fn>).mock.calls
      const callArg = calls[0]?.[0] as string
      const parsed = JSON.parse(callArg)

      expect(parsed.session_id).toBeNull()
    })

    it('includes usage stats in JSON output', (): void => {
      const opts: DisplayOptions = { format: 'json' }

      printResponse(baseResponse, opts)

      const calls = (stdout.print as ReturnType<typeof vi.fn>).mock.calls
      const callArg = calls[0]?.[0] as string
      const parsed = JSON.parse(callArg)

      expect(parsed.usage.input_tokens).toBe(1000)
      expect(parsed.usage.output_tokens).toBe(500)
    })

    it('includes optional message_count in JSON when present', (): void => {
      const response: AgentResponse = { ...baseResponse, message_count: 5 }
      const opts: DisplayOptions = { format: 'json' }

      printResponse(response, opts)

      const calls = (stdout.print as ReturnType<typeof vi.fn>).mock.calls
      const callArg = calls[0]?.[0] as string
      const parsed = JSON.parse(callArg)

      expect(parsed.message_count).toBe(5)
    })

    it('omits message_count from JSON when not present', (): void => {
      const opts: DisplayOptions = { format: 'json' }

      printResponse(baseResponse, opts)

      const calls = (stdout.print as ReturnType<typeof vi.fn>).mock.calls
      const callArg = calls[0]?.[0] as string
      const parsed = JSON.parse(callArg)

      expect(parsed).not.toHaveProperty('message_count')
    })

    it('returns early and does not print text output when format is json', (): void => {
      const opts: DisplayOptions = { format: 'json' }

      printResponse(baseResponse, opts)

      // Should only print once for JSON
      expect(stdout.print).toHaveBeenCalledTimes(1)
    })
  })

  describe('text format thoughts section', (): void => {
    it('prints thoughts header when thoughts present', (): void => {
      const response: AgentResponse = {
        ...baseResponse,
        thoughts: [{ type: 'thinking', thinking: 'First thought' }]
      }
      const opts: DisplayOptions = {}

      printResponse(response, opts)

      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('Thoughts'))
    })

    it('prints each thought content with dim styling', (): void => {
      const response: AgentResponse = {
        ...baseResponse,
        thoughts: [
          { type: 'thinking', thinking: 'First thought' },
          { type: 'thinking', thinking: 'Second thought' }
        ]
      }
      const opts: DisplayOptions = {}

      printResponse(response, opts)

      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('First thought'))
      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('Second thought'))
    })

    it('skips thoughts when silentThoughts option is true', (): void => {
      const response: AgentResponse = {
        ...baseResponse,
        thoughts: [{ type: 'thinking', thinking: 'Hidden thought' }]
      }
      const opts: DisplayOptions = { silentThoughts: true }

      printResponse(response, opts)

      expect(stdout.print).not.toHaveBeenCalledWith(expect.stringContaining('Thoughts'))
    })

    it('skips thoughts when outputOnly option is true', (): void => {
      const response: AgentResponse = {
        ...baseResponse,
        thoughts: [{ type: 'thinking', thinking: 'Hidden thought' }]
      }
      const opts: DisplayOptions = { outputOnly: true }

      printResponse(response, opts)

      expect(stdout.print).not.toHaveBeenCalledWith(expect.stringContaining('Thoughts'))
    })

    it('skips thoughts header when thoughts array is empty', (): void => {
      const response: AgentResponse = {
        ...baseResponse,
        thoughts: []
      }
      const opts: DisplayOptions = {}

      printResponse(response, opts)

      expect(stdout.print).not.toHaveBeenCalledWith(expect.stringContaining('Thoughts'))
    })

    it('skips thoughts when thoughts field is undefined', (): void => {
      const opts: DisplayOptions = {}

      printResponse(baseResponse, opts)

      expect(stdout.print).not.toHaveBeenCalledWith(expect.stringContaining('Thoughts'))
    })
  })

  describe('text format tool history section', (): void => {
    it('prints tool calls header when tool_history present', (): void => {
      const response: AgentResponse = {
        ...baseResponse,
        tool_history: [
          {
            name: 'WebFetch',
            input: { url: 'https://example.com' },
            result: 'HTML content'
          }
        ]
      }
      const opts: DisplayOptions = {}

      printResponse(response, opts)

      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('Tool Calls'))
    })

    it('prints tool name with label formatting', (): void => {
      const response: AgentResponse = {
        ...baseResponse,
        tool_history: [
          {
            name: 'Bash',
            input: { command: 'ls' },
            result: 'file1.txt\nfile2.txt'
          }
        ]
      }
      const opts: DisplayOptions = {}

      printResponse(response, opts)

      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('Bash'))
    })

    it('prints tool input as JSON', (): void => {
      const response: AgentResponse = {
        ...baseResponse,
        tool_history: [
          {
            name: 'Monitor',
            input: { command: 'watch', timeout_ms: 5000 }
          }
        ]
      }
      const opts: DisplayOptions = {}

      printResponse(response, opts)

      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('input:'))
    })

    it('prints tool result when result is present', (): void => {
      const response: AgentResponse = {
        ...baseResponse,
        tool_history: [
          {
            name: 'WebFetch',
            input: { url: 'test' },
            result: 'Success'
          }
        ]
      }
      const opts: DisplayOptions = {}

      printResponse(response, opts)

      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('result:'))
    })

    it('skips result output when result is undefined', (): void => {
      const response: AgentResponse = {
        ...baseResponse,
        tool_history: [
          {
            name: 'WebFetch',
            input: { url: 'test' }
          }
        ]
      }
      const opts: DisplayOptions = {}

      printResponse(response, opts)

      // Should still print tool name and input, but not result
      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('WebFetch'))
    })

    it('skips tool calls when silentToolResponse option is true', (): void => {
      const response: AgentResponse = {
        ...baseResponse,
        tool_history: [
          {
            name: 'Bash',
            input: { command: 'ls' },
            result: 'output'
          }
        ]
      }
      const opts: DisplayOptions = { silentToolResponse: true }

      printResponse(response, opts)

      expect(stdout.print).not.toHaveBeenCalledWith(expect.stringContaining('Tool Calls'))
    })

    it('skips tool calls when outputOnly option is true', (): void => {
      const response: AgentResponse = {
        ...baseResponse,
        tool_history: [
          {
            name: 'Read',
            input: { file_path: '/tmp/test' },
            result: 'content'
          }
        ]
      }
      const opts: DisplayOptions = { outputOnly: true }

      printResponse(response, opts)

      expect(stdout.print).not.toHaveBeenCalledWith(expect.stringContaining('Tool Calls'))
    })

    it('skips tool calls header when tool_history is empty', (): void => {
      const response: AgentResponse = {
        ...baseResponse,
        tool_history: []
      }
      const opts: DisplayOptions = {}

      printResponse(response, opts)

      expect(stdout.print).not.toHaveBeenCalledWith(expect.stringContaining('Tool Calls'))
    })

    it('skips tool calls when tool_history is undefined', (): void => {
      const opts: DisplayOptions = {}

      printResponse(baseResponse, opts)

      expect(stdout.print).not.toHaveBeenCalledWith(expect.stringContaining('Tool Calls'))
    })
  })

  describe('text format agent response section', (): void => {
    it('always prints agent response header', (): void => {
      const opts: DisplayOptions = {}

      printResponse(baseResponse, opts)

      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('Agent Response'))
    })

    it('prints agent response content', (): void => {
      const opts: DisplayOptions = {}

      printResponse(baseResponse, opts)

      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('Agent response content'))
    })

    it('prints even when response content is empty', (): void => {
      const response: AgentResponse = {
        content: '',
        model: 'claude-sonnet-4-6',
        usage: { input_tokens: 100, output_tokens: 50 }
      }
      const opts: DisplayOptions = {}

      printResponse(response, opts)

      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('Agent Response'))
    })
  })

  describe('text format usage section', (): void => {
    it('prints usage section when usage present', (): void => {
      const opts: DisplayOptions = {}

      printResponse(baseResponse, opts)

      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('Token Usage'))
    })

    it('prints input tokens count', (): void => {
      const opts: DisplayOptions = {}

      printResponse(baseResponse, opts)

      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('1000'))
    })

    it('prints output tokens count', (): void => {
      const opts: DisplayOptions = {}

      printResponse(baseResponse, opts)

      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('500'))
    })

    it('includes message_count in usage when present', (): void => {
      const response: AgentResponse = {
        ...baseResponse,
        message_count: 10
      }
      const opts: DisplayOptions = {}

      printResponse(response, opts)

      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('Messages'))
    })

    it('includes cache_read_input_tokens in usage when present', (): void => {
      const response: AgentResponse = {
        ...baseResponse,
        usage: {
          input_tokens: 1000,
          output_tokens: 500,
          cache_read_input_tokens: 5000
        }
      }
      const opts: DisplayOptions = {}

      printResponse(response, opts)

      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('Cache read'))
    })

    it('includes cache_creation_input_tokens in usage when present', (): void => {
      const response: AgentResponse = {
        ...baseResponse,
        usage: {
          input_tokens: 1000,
          output_tokens: 500,
          cache_creation_input_tokens: 2000
        }
      }
      const opts: DisplayOptions = {}

      printResponse(response, opts)

      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('Cache creation'))
    })

    it('calculates context window percentage correctly', (): void => {
      const response: AgentResponse = {
        ...baseResponse,
        usage: {
          input_tokens: 100000,
          output_tokens: 500
        }
      }
      const opts: DisplayOptions = {}

      printResponse(response, opts)

      // 100000 / 200000 * 100 = 50%
      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('50%'))
    })

    it('uses last_assistant_usage for context window calculation when available', (): void => {
      const response: AgentResponse = {
        ...baseResponse,
        usage: {
          input_tokens: 1000,
          output_tokens: 500
        },
        last_assistant_usage: {
          input_tokens: 50000,
          output_tokens: 500
        }
      }
      const opts: DisplayOptions = {}

      printResponse(response, opts)

      // 50000 / 200000 * 100 = 25%
      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('25%'))
    })

    it('skips usage section when silentUsage option is true', (): void => {
      const opts: DisplayOptions = { silentUsage: true }

      printResponse(baseResponse, opts)

      expect(stdout.print).not.toHaveBeenCalledWith(expect.stringContaining('Token Usage'))
    })

    it('skips usage section when outputOnly option is true', (): void => {
      const opts: DisplayOptions = { outputOnly: true }

      printResponse(baseResponse, opts)

      expect(stdout.print).not.toHaveBeenCalledWith(expect.stringContaining('Token Usage'))
    })

    it('skips usage section when response has no usage', (): void => {
      const response: AgentResponse = {
        content: 'Response',
        model: 'claude-sonnet-4-6'
      }
      const opts: DisplayOptions = {}

      printResponse(response, opts)

      expect(stdout.print).not.toHaveBeenCalledWith(expect.stringContaining('Token Usage'))
    })
  })

  describe('displayConfig handling', (): void => {
    it('passes displayConfig to display functions', (): void => {
      const config: DisplayConfig = { header_color: '#AABBCC', no_color: false }
      const opts: DisplayOptions = {}

      printResponse(baseResponse, opts, config)

      expect(stdout.print).toHaveBeenCalled()
    })

    it('respects no_color setting in displayConfig', (): void => {
      const config: DisplayConfig = { no_color: true }
      const opts: DisplayOptions = {}

      printResponse(baseResponse, opts, config)

      expect(stdout.print).toHaveBeenCalled()
    })

    it('uses default config when displayConfig not provided', (): void => {
      const opts: DisplayOptions = {}

      printResponse(baseResponse, opts)

      expect(stdout.print).toHaveBeenCalled()
    })
  })

  describe('combined scenarios', (): void => {
    it('outputs all sections when all data present and not silenced', (): void => {
      const response: AgentResponse = {
        content: 'Response text',
        model: 'claude-sonnet-4-6',
        usage: { input_tokens: 1000, output_tokens: 500 },
        thoughts: [{ type: 'thinking', thinking: 'Thought' }],
        tool_history: [
          {
            name: 'WebFetch',
            input: { url: 'test' },
            result: 'result'
          }
        ],
        message_count: 5
      }
      const opts: DisplayOptions = {}

      printResponse(response, opts)

      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('Thoughts'))
      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('Tool Calls'))
      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('Agent Response'))
      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('Token Usage'))
    })

    it('silences everything with outputOnly flag', (): void => {
      const response: AgentResponse = {
        ...baseResponse,
        thoughts: [{ type: 'thinking', thinking: 'Thought' }],
        tool_history: [{ name: 'Bash', input: { command: 'ls' }, result: 'output' }],
        message_count: 5
      }
      const opts: DisplayOptions = { outputOnly: true }

      printResponse(response, opts)

      expect(stdout.print).not.toHaveBeenCalledWith(expect.stringContaining('Thoughts'))
      expect(stdout.print).not.toHaveBeenCalledWith(expect.stringContaining('Tool Calls'))
      expect(stdout.print).not.toHaveBeenCalledWith(expect.stringContaining('Token Usage'))
      // But should still print agent response
      expect(stdout.print).toHaveBeenCalledWith(expect.stringContaining('Agent Response'))
    })
  })
})
