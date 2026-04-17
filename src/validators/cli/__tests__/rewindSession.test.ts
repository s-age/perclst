import { describe, it, expect } from 'vitest'
import { parseRewindSession } from '../rewindSession'
import { ValidationError } from '@src/errors/validationError'

// parseRewindSession is a pure delegation to safeParse — no mocks needed.
// Tests exercise the full schema validation behaviour end-to-end.

describe('parseRewindSession', () => {
  describe('happy path — full valid input', () => {
    it('returns all fields when every property is provided and valid', () => {
      const raw = { sessionId: 'abc-123', index: 2, list: true, length: 5 }
      const result = parseRewindSession(raw)
      expect(result).toEqual({ sessionId: 'abc-123', index: 2, list: true, length: 5 })
    })
  })

  describe('happy path — only required field', () => {
    it('returns object with only sessionId when optional fields are absent', () => {
      const result = parseRewindSession({ sessionId: 'only-required' })
      expect(result.sessionId).toBe('only-required')
      expect(result.index).toBeUndefined()
      expect(result.list).toBeUndefined()
      expect(result.length).toBeUndefined()
    })
  })

  describe('boundary values', () => {
    it('accepts index = 0 (min boundary)', () => {
      const result = parseRewindSession({ sessionId: 's1', index: 0 })
      expect(result.index).toBe(0)
    })

    it('accepts length = 1 (min boundary)', () => {
      const result = parseRewindSession({ sessionId: 's1', length: 1 })
      expect(result.length).toBe(1)
    })

    it('coerces a numeric string for index via z.coerce.number', () => {
      const result = parseRewindSession({ sessionId: 's1', index: '3' })
      expect(result.index).toBe(3)
    })

    it('coerces a numeric string for length via z.coerce.number', () => {
      const result = parseRewindSession({ sessionId: 's1', length: '4' })
      expect(result.length).toBe(4)
    })

    it('accepts list = false', () => {
      const result = parseRewindSession({ sessionId: 's1', list: false })
      expect(result.list).toBe(false)
    })
  })

  describe('error path — sessionId violations', () => {
    it('throws ValidationError when sessionId is missing', () => {
      expect(() => parseRewindSession({ index: 1 })).toThrow(ValidationError)
    })

    it('throws ValidationError when sessionId is an empty string', () => {
      expect(() => parseRewindSession({ sessionId: '' })).toThrow(ValidationError)
    })

    it('throws ValidationError when sessionId is not a string', () => {
      expect(() => parseRewindSession({ sessionId: 42 })).toThrow(ValidationError)
    })

    it('error message references the sessionId field', () => {
      expect(() => parseRewindSession({ sessionId: '' })).toThrowError(/sessionId/)
    })
  })

  describe('error path — index violations', () => {
    it('throws ValidationError when index is below 0', () => {
      expect(() => parseRewindSession({ sessionId: 's1', index: -1 })).toThrow(ValidationError)
    })

    it('throws ValidationError when index is a non-integer float', () => {
      expect(() => parseRewindSession({ sessionId: 's1', index: 1.5 })).toThrow(ValidationError)
    })
  })

  describe('error path — length violations', () => {
    it('throws ValidationError when length is 0 (below min of 1)', () => {
      expect(() => parseRewindSession({ sessionId: 's1', length: 0 })).toThrow(ValidationError)
    })

    it('throws ValidationError when length is negative', () => {
      expect(() => parseRewindSession({ sessionId: 's1', length: -5 })).toThrow(ValidationError)
    })

    it('throws ValidationError when length is a non-integer float', () => {
      expect(() => parseRewindSession({ sessionId: 's1', length: 2.9 })).toThrow(ValidationError)
    })
  })

  describe('error path — list violations', () => {
    it('throws ValidationError when list is a non-coercible string', () => {
      expect(() => parseRewindSession({ sessionId: 's1', list: 'true' })).toThrow(ValidationError)
    })

    it('throws ValidationError when list is a number', () => {
      expect(() => parseRewindSession({ sessionId: 's1', list: 1 })).toThrow(ValidationError)
    })
  })

  describe('error path — non-object raw input', () => {
    it('throws ValidationError when raw is null', () => {
      expect(() => parseRewindSession(null)).toThrow(ValidationError)
    })

    it('throws ValidationError when raw is a primitive string', () => {
      expect(() => parseRewindSession('not-an-object')).toThrow(ValidationError)
    })

    it('throws ValidationError when raw is undefined', () => {
      expect(() => parseRewindSession(undefined)).toThrow(ValidationError)
    })

    it('throws ValidationError when raw is an array', () => {
      expect(() => parseRewindSession([])).toThrow(ValidationError)
    })
  })
})
