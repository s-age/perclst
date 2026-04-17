import { describe, it, expect } from 'vitest'
import { parseForkSession } from '../forkSession'
import { ValidationError } from '@src/errors/validationError'

describe('parseForkSession', () => {
  const minimal = { originalSessionId: 'abc-123', prompt: 'continue from here' }

  it('should parse with only required fields', () => {
    const result = parseForkSession(minimal)
    expect(result.originalSessionId).toBe('abc-123')
    expect(result.prompt).toBe('continue from here')
    expect(result.format).toBe('text')
  })

  it('should parse all optional fields when provided', () => {
    const result = parseForkSession({
      originalSessionId: 'abc-123',
      prompt: 'fork and do more',
      name: 'forked-session',
      allowedTools: ['Bash', 'Read'],
      disallowedTools: ['Write'],
      model: 'haiku',
      maxTurns: 5,
      maxContextTokens: 20000,
      format: 'json',
      silentThoughts: true,
      silentToolResponse: false,
      silentUsage: true,
      outputOnly: true
    })
    expect(result.originalSessionId).toBe('abc-123')
    expect(result.prompt).toBe('fork and do more')
    expect(result.name).toBe('forked-session')
    expect(result.allowedTools).toEqual(['Bash', 'Read'])
    expect(result.disallowedTools).toEqual(['Write'])
    expect(result.model).toBe('haiku')
    expect(result.maxTurns).toBe(5)
    expect(result.maxContextTokens).toBe(20000)
    expect(result.format).toBe('json')
    expect(result.silentThoughts).toBe(true)
    expect(result.silentToolResponse).toBe(false)
    expect(result.silentUsage).toBe(true)
    expect(result.outputOnly).toBe(true)
  })

  it('should throw ValidationError when originalSessionId is missing', () => {
    expect(() => parseForkSession({ prompt: 'do something' })).toThrow(ValidationError)
  })

  it('should throw ValidationError when originalSessionId is empty string', () => {
    expect(() => parseForkSession({ originalSessionId: '', prompt: 'do something' })).toThrow(
      ValidationError
    )
  })

  it('should throw ValidationError when prompt is missing', () => {
    expect(() => parseForkSession({ originalSessionId: 'abc-123' })).toThrow(ValidationError)
  })

  it('should throw ValidationError when prompt is empty string', () => {
    expect(() => parseForkSession({ originalSessionId: 'abc-123', prompt: '' })).toThrow(
      ValidationError
    )
  })

  it('should throw ValidationError when both required fields are missing', () => {
    expect(() => parseForkSession({})).toThrow(ValidationError)
  })

  it('should throw ValidationError for invalid format value', () => {
    expect(() =>
      parseForkSession({ originalSessionId: 'abc-123', prompt: 'x', format: 'xml' })
    ).toThrow(ValidationError)
  })

  it('should pass through integer maxTurns', () => {
    const result = parseForkSession({ ...minimal, maxTurns: 3 })
    expect(result.maxTurns).toBe(3)
  })

  it('should throw ValidationError when maxTurns is a float', () => {
    expect(() => parseForkSession({ ...minimal, maxTurns: 2.5 })).toThrow(ValidationError)
  })

  it('should pass through integer maxContextTokens', () => {
    const result = parseForkSession({ ...minimal, maxContextTokens: 8000 })
    expect(result.maxContextTokens).toBe(8000)
  })

  it('should throw ValidationError when maxContextTokens is a float', () => {
    expect(() => parseForkSession({ ...minimal, maxContextTokens: 1.1 })).toThrow(ValidationError)
  })

  it('should accept format text explicitly', () => {
    const result = parseForkSession({ ...minimal, format: 'text' })
    expect(result.format).toBe('text')
  })

  it('should accept disallowedTools as an array of strings', () => {
    const result = parseForkSession({ ...minimal, disallowedTools: ['Bash', 'Write'] })
    expect(result.disallowedTools).toEqual(['Bash', 'Write'])
  })

  it('should throw ValidationError when raw input is null', () => {
    expect(() => parseForkSession(null)).toThrow(ValidationError)
  })

  it('should throw ValidationError when raw input is a string', () => {
    expect(() => parseForkSession('string')).toThrow(ValidationError)
  })

  it('should throw ValidationError when raw input is a number', () => {
    expect(() => parseForkSession(42)).toThrow(ValidationError)
  })

  it('should throw ValidationError when a boolean field receives a string', () => {
    expect(() => parseForkSession({ ...minimal, silentThoughts: 'yes' })).toThrow(ValidationError)
  })
})
