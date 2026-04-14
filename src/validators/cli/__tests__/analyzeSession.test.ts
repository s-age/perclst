import { describe, it, expect } from 'vitest'
import { parseAnalyzeSession } from '../analyzeSession'
import { ValidationError } from '@src/errors/validationError'

describe('parseAnalyzeSession', () => {
  it('should parse with sessionId only', () => {
    const result = parseAnalyzeSession({ sessionId: 'abc-123' })
    expect(result.sessionId).toBe('abc-123')
    expect(result.format).toBe('text')
    expect(result.printDetail).toBeUndefined()
  })

  it('should parse with all fields provided', () => {
    const result = parseAnalyzeSession({
      sessionId: 'abc-123',
      format: 'json',
      printDetail: true
    })
    expect(result.format).toBe('json')
    expect(result.printDetail).toBe(true)
  })

  it('should throw ValidationError when sessionId is missing', () => {
    expect(() => parseAnalyzeSession({})).toThrow(ValidationError)
  })

  it('should throw ValidationError when sessionId is empty', () => {
    expect(() => parseAnalyzeSession({ sessionId: '' })).toThrow(ValidationError)
  })

  it('should throw ValidationError for invalid format value', () => {
    expect(() => parseAnalyzeSession({ sessionId: 'abc', format: 'html' })).toThrow(ValidationError)
  })
})
