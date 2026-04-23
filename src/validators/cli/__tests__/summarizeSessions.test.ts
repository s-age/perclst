import { vi, describe, it, expect, beforeEach } from 'vitest'
import { parseSummarizeSessions } from '../summarizeSessions'

// Mock the schema module
vi.mock('../../schema', () => ({
  schema: vi.fn(() => ({})),
  safeParse: vi.fn()
}))

import { safeParse } from '../../schema'

describe('parseSummarizeSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('happy path', () => {
    it('returns parsed output when safeParse succeeds with valid input', () => {
      const validInput = { format: 'text' as const, label: 'my-session' }
      const expectedOutput = { format: 'text' as const, label: 'my-session' }

      vi.mocked(safeParse).mockReturnValue(expectedOutput)

      const result = parseSummarizeSessions(validInput)

      expect(result).toEqual(expectedOutput)
    })

    it('calls safeParse with the raw input as second argument', () => {
      const testInput = { format: 'json' as const }

      vi.mocked(safeParse).mockReturnValue(testInput)

      parseSummarizeSessions(testInput)

      expect(safeParse).toHaveBeenCalledOnce()
      // safeParse is called with (schema, raw) — verify the raw input
      const rawArg = vi.mocked(safeParse).mock.calls[0][1]
      expect(rawArg).toEqual(testInput)
    })

    it('returns parsed output with all optional fields when provided', () => {
      const completeInput = {
        format: 'json' as const,
        label: 'sessions',
        like: 'pattern'
      }
      const expectedOutput = {
        format: 'json' as const,
        label: 'sessions',
        like: 'pattern'
      }

      vi.mocked(safeParse).mockReturnValue(expectedOutput)

      const result = parseSummarizeSessions(completeInput)

      expect(result).toEqual(expectedOutput)
    })

    it('returns parsed output with only format field (other fields optional)', () => {
      const minimalInput = { format: 'text' as const }
      const expectedOutput = { format: 'text' as const }

      vi.mocked(safeParse).mockReturnValue(expectedOutput)

      const result = parseSummarizeSessions(minimalInput)

      expect(result).toEqual(expectedOutput)
    })
  })

  describe('error handling', () => {
    it('throws when safeParse throws validation error', () => {
      const invalidInput = { format: 'invalid' }
      const validationError = new Error('Validation failed')

      vi.mocked(safeParse).mockImplementation(() => {
        throw validationError
      })

      expect(() => parseSummarizeSessions(invalidInput)).toThrow(validationError)
    })

    it('throws when safeParse throws on null input', () => {
      const parseError = new Error('Cannot parse null')

      vi.mocked(safeParse).mockImplementation(() => {
        throw parseError
      })

      expect(() => parseSummarizeSessions(null)).toThrow(parseError)
    })

    it('throws when safeParse throws on undefined input', () => {
      const parseError = new Error('Cannot parse undefined')

      vi.mocked(safeParse).mockImplementation(() => {
        throw parseError
      })

      expect(() => parseSummarizeSessions(undefined)).toThrow(parseError)
    })
  })

  describe('type preservation', () => {
    it('preserves the format literal type in output', () => {
      const input = { format: 'json' as const }
      const output = { format: 'json' as const, label: undefined }

      vi.mocked(safeParse).mockReturnValue(output)

      const result = parseSummarizeSessions(input)

      expect(result.format).toBe('json')
    })

    it('preserves string values for label and like fields', () => {
      const input = {
        format: 'text' as const,
        label: 'test-label',
        like: 'test-pattern'
      }
      const output = input

      vi.mocked(safeParse).mockReturnValue(output)

      const result = parseSummarizeSessions(input)

      expect(result.label).toBe('test-label')
      expect(result.like).toBe('test-pattern')
    })
  })

  describe('edge cases', () => {
    it('handles empty object input', () => {
      const emptyInput = {}
      const parsedOutput = { format: 'text' as const }

      vi.mocked(safeParse).mockReturnValue(parsedOutput)

      const result = parseSummarizeSessions(emptyInput)

      expect(result).toEqual(parsedOutput)
    })

    it('handles input with extra unknown fields', () => {
      const inputWithExtras = {
        format: 'json' as const,
        unknownField: 'should be stripped'
      }
      const parsedOutput = { format: 'json' as const }

      vi.mocked(safeParse).mockReturnValue(parsedOutput)

      const result = parseSummarizeSessions(inputWithExtras)

      expect(result).toEqual(parsedOutput)
    })

    it('safeParse receives the exact raw input without mutation', () => {
      const originalInput = { format: 'text' as const, label: 'session' }
      const inputCopy = { ...originalInput }

      vi.mocked(safeParse).mockReturnValue(originalInput)

      parseSummarizeSessions(originalInput)

      expect(originalInput).toEqual(inputCopy)
    })
  })
})
