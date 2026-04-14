import { describe, it, expect } from 'vitest'
import { parseDeleteSession } from '../deleteSession'
import { ValidationError } from '@src/errors/validationError'

describe('parseDeleteSession', () => {
  it('should parse a valid sessionId', () => {
    const result = parseDeleteSession({ sessionId: 'abc-123' })
    expect(result.sessionId).toBe('abc-123')
  })

  it('should throw ValidationError when sessionId is missing', () => {
    expect(() => parseDeleteSession({})).toThrow(ValidationError)
  })

  it('should throw ValidationError when sessionId is empty', () => {
    expect(() => parseDeleteSession({ sessionId: '' })).toThrow(ValidationError)
  })

  it('should throw ValidationError for non-object input', () => {
    expect(() => parseDeleteSession(null)).toThrow(ValidationError)
  })
})
