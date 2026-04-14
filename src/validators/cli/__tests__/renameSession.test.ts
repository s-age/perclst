import { describe, it, expect } from 'vitest'
import { parseRenameSession } from '../renameSession'
import { ValidationError } from '@src/errors/validationError'

describe('parseRenameSession', () => {
  it('should parse valid sessionId and name', () => {
    const result = parseRenameSession({ sessionId: 'abc-123', name: 'new-name' })
    expect(result.sessionId).toBe('abc-123')
    expect(result.name).toBe('new-name')
  })

  it('should throw ValidationError when sessionId is missing', () => {
    expect(() => parseRenameSession({ name: 'new-name' })).toThrow(ValidationError)
  })

  it('should throw ValidationError when sessionId is empty', () => {
    expect(() => parseRenameSession({ sessionId: '', name: 'new-name' })).toThrow(ValidationError)
  })

  it('should throw ValidationError when name is missing', () => {
    expect(() => parseRenameSession({ sessionId: 'abc' })).toThrow(ValidationError)
  })

  it('should throw ValidationError when name is empty', () => {
    expect(() => parseRenameSession({ sessionId: 'abc', name: '' })).toThrow(ValidationError)
  })
})
