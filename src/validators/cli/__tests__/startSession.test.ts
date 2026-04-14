import { describe, it, expect } from 'vitest'
import { parseStartSession } from '../startSession'
import { ValidationError } from '@src/errors/validationError'

describe('parseStartSession', () => {
  const minimal = { task: 'do something' }

  it('should parse with only required task field', () => {
    const result = parseStartSession(minimal)
    expect(result.task).toBe('do something')
    expect(result.format).toBe('text')
  })

  it('should parse all optional fields when provided', () => {
    const result = parseStartSession({
      task: 'task',
      procedure: 'default',
      name: 'my-session',
      tags: ['a', 'b'],
      allowedTools: ['Bash', 'Read'],
      model: 'sonnet',
      maxTurns: 10,
      maxContextTokens: 50000,
      format: 'json',
      silentThoughts: true,
      silentToolResponse: false,
      silentUsage: true,
      outputOnly: true
    })
    expect(result.procedure).toBe('default')
    expect(result.name).toBe('my-session')
    expect(result.tags).toEqual(['a', 'b'])
    expect(result.allowedTools).toEqual(['Bash', 'Read'])
    expect(result.model).toBe('sonnet')
    expect(result.maxTurns).toBe(10)
    expect(result.maxContextTokens).toBe(50000)
    expect(result.format).toBe('json')
    expect(result.silentThoughts).toBe(true)
    expect(result.silentToolResponse).toBe(false)
    expect(result.silentUsage).toBe(true)
    expect(result.outputOnly).toBe(true)
  })

  it('should throw ValidationError when task is missing', () => {
    expect(() => parseStartSession({})).toThrow(ValidationError)
  })

  it('should throw ValidationError when task is empty string', () => {
    expect(() => parseStartSession({ task: '' })).toThrow(ValidationError)
  })

  it('should throw ValidationError for invalid format value', () => {
    expect(() => parseStartSession({ task: 'x', format: 'xml' })).toThrow(ValidationError)
  })

  it('should pass through integer maxTurns', () => {
    const result = parseStartSession({ task: 'x', maxTurns: 10 })
    expect(result.maxTurns).toBe(10)
  })

  it('should throw ValidationError when maxTurns is a float', () => {
    expect(() => parseStartSession({ task: 'x', maxTurns: 3.9 })).toThrow(ValidationError)
  })
})
