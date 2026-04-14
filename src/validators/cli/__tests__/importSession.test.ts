import { describe, it, expect } from 'vitest'
import { parseImportSession } from '../importSession'
import { ValidationError } from '@src/errors/validationError'

describe('parseImportSession', () => {
  it('should parse with required claudeSessionId only', () => {
    const result = parseImportSession({ claudeSessionId: 'claude-abc' })
    expect(result.claudeSessionId).toBe('claude-abc')
    expect(result.name).toBeUndefined()
    expect(result.cwd).toBeUndefined()
  })

  it('should parse with all optional fields provided', () => {
    const result = parseImportSession({
      claudeSessionId: 'claude-abc',
      name: 'imported-session',
      cwd: '/home/user/project'
    })
    expect(result.name).toBe('imported-session')
    expect(result.cwd).toBe('/home/user/project')
  })

  it('should throw ValidationError when claudeSessionId is missing', () => {
    expect(() => parseImportSession({})).toThrow(ValidationError)
  })

  it('should throw ValidationError when claudeSessionId is empty', () => {
    expect(() => parseImportSession({ claudeSessionId: '' })).toThrow(ValidationError)
  })
})
