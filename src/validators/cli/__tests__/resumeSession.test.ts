import { describe, it, expect } from 'vitest'
import { parseResumeSession } from '../resumeSession'
import { ValidationError } from '@src/errors/validationError'

describe('parseResumeSession', () => {
  const minimal = { sessionId: 'abc-123', instruction: 'continue' }

  it('should parse with required fields only', () => {
    const result = parseResumeSession(minimal)
    expect(result.sessionId).toBe('abc-123')
    expect(result.instruction).toBe('continue')
    expect(result.format).toBe('text')
  })

  it('should parse all optional fields when provided', () => {
    const result = parseResumeSession({
      ...minimal,
      allowedTools: ['WebFetch'],
      model: 'opus',
      maxMessages: 5,
      maxContextTokens: 20000,
      format: 'json',
      silentThoughts: false,
      silentToolResponse: true,
      silentUsage: false,
      outputOnly: false
    })
    expect(result.allowedTools).toEqual(['WebFetch'])
    expect(result.model).toBe('opus')
    expect(result.maxMessages).toBe(5)
    expect(result.maxContextTokens).toBe(20000)
    expect(result.format).toBe('json')
    expect(result.silentThoughts).toBe(false)
    expect(result.silentToolResponse).toBe(true)
    expect(result.outputOnly).toBe(false)
  })

  it('should throw ValidationError when sessionId is missing', () => {
    expect(() => parseResumeSession({ instruction: 'hi' })).toThrow(ValidationError)
  })

  it('should throw ValidationError when sessionId is empty', () => {
    expect(() => parseResumeSession({ sessionId: '', instruction: 'hi' })).toThrow(ValidationError)
  })

  it('should throw ValidationError when instruction is missing', () => {
    expect(() => parseResumeSession({ sessionId: 'abc' })).toThrow(ValidationError)
  })

  it('should throw ValidationError when instruction is empty', () => {
    expect(() => parseResumeSession({ sessionId: 'abc', instruction: '' })).toThrow(ValidationError)
  })

  it('should throw ValidationError for invalid format value', () => {
    expect(() => parseResumeSession({ ...minimal, format: 'csv' })).toThrow(ValidationError)
  })
})
