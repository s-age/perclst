import { describe, it, expect } from 'vitest'
import { parseShowSession } from '../showSession'
import { ValidationError } from '@src/errors/validationError'

describe('parseShowSession', () => {
  it('should parse with sessionId only', () => {
    const result = parseShowSession({ sessionId: 'abc' })
    expect(result.sessionId).toBe('abc')
    expect(result.format).toBe('text')
  })

  it('should parse with json format', () => {
    const result = parseShowSession({ sessionId: 'abc', format: 'json' })
    expect(result.format).toBe('json')
  })

  it('should throw ValidationError when sessionId is missing', () => {
    expect(() => parseShowSession({})).toThrow(ValidationError)
  })

  it('should throw ValidationError when sessionId is empty', () => {
    expect(() => parseShowSession({ sessionId: '' })).toThrow(ValidationError)
  })

  it('should throw ValidationError for invalid format value', () => {
    expect(() => parseShowSession({ sessionId: 'abc', format: 'yaml' })).toThrow(ValidationError)
  })
})
