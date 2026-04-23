import { describe, it, expect } from 'vitest'
import { parseInspectSession } from '../inspectSession'
import { ValidationError } from '@src/errors/validationError'

describe('parseInspectSession', () => {
  it('should parse valid git refs for old and new', () => {
    const result = parseInspectSession({ old: 'main', new: 'develop' })
    expect(result.old).toBe('main')
    expect(result.new).toBe('develop')
  })

  it('should parse feature branch names', () => {
    const result = parseInspectSession({ old: 'feature/new-ui', new: 'main' })
    expect(result.old).toBe('feature/new-ui')
    expect(result.new).toBe('main')
  })

  it('should parse version tags', () => {
    const result = parseInspectSession({ old: 'v1.0.0', new: 'v1.1.0' })
    expect(result.old).toBe('v1.0.0')
    expect(result.new).toBe('v1.1.0')
  })

  it('should parse commit SHAs', () => {
    const result = parseInspectSession({ old: 'abc123def456', new: '789ghi012jkl' })
    expect(result.old).toBe('abc123def456')
    expect(result.new).toBe('789ghi012jkl')
  })

  it('should parse refs with underscores and hyphens', () => {
    const result = parseInspectSession({ old: 'release_v2-beta', new: 'hotfix-urgent' })
    expect(result.old).toBe('release_v2-beta')
    expect(result.new).toBe('hotfix-urgent')
  })

  it('should throw ValidationError when old field is missing', () => {
    expect(() => parseInspectSession({ new: 'main' })).toThrow(ValidationError)
  })

  it('should throw ValidationError when new field is missing', () => {
    expect(() => parseInspectSession({ old: 'main' })).toThrow(ValidationError)
  })

  it('should throw ValidationError when old is an empty string', () => {
    expect(() => parseInspectSession({ old: '', new: 'main' })).toThrow(ValidationError)
  })

  it('should throw ValidationError when new is an empty string', () => {
    expect(() => parseInspectSession({ old: 'main', new: '' })).toThrow(ValidationError)
  })

  it('should throw ValidationError when old contains invalid characters (space)', () => {
    expect(() => parseInspectSession({ old: 'feature branch', new: 'main' })).toThrow(
      ValidationError
    )
  })

  it('should throw ValidationError when old contains invalid characters (shell metacharacter @)', () => {
    expect(() => parseInspectSession({ old: 'feature@main', new: 'develop' })).toThrow(
      ValidationError
    )
  })

  it('should throw ValidationError when new contains invalid characters (space)', () => {
    expect(() => parseInspectSession({ old: 'main', new: 'dev branch' })).toThrow(ValidationError)
  })

  it('should throw ValidationError when new contains invalid characters (shell metacharacter $)', () => {
    expect(() => parseInspectSession({ old: 'main', new: 'release$v1' })).toThrow(ValidationError)
  })

  it('should throw ValidationError when old is not a string', () => {
    expect(() => parseInspectSession({ old: 123, new: 'main' })).toThrow(ValidationError)
  })

  it('should throw ValidationError when new is not a string', () => {
    expect(() => parseInspectSession({ old: 'main', new: false })).toThrow(ValidationError)
  })

  it('should throw ValidationError when old is null', () => {
    expect(() => parseInspectSession({ old: null, new: 'main' })).toThrow(ValidationError)
  })

  it('should throw ValidationError when new is null', () => {
    expect(() => parseInspectSession({ old: 'main', new: null })).toThrow(ValidationError)
  })

  it('should throw ValidationError for non-object input (null)', () => {
    expect(() => parseInspectSession(null)).toThrow(ValidationError)
  })

  it('should throw ValidationError for non-object input (string)', () => {
    expect(() => parseInspectSession('main')).toThrow(ValidationError)
  })

  it('should throw ValidationError for non-object input (number)', () => {
    expect(() => parseInspectSession(42)).toThrow(ValidationError)
  })

  it('should throw ValidationError for non-object input (array)', () => {
    expect(() => parseInspectSession(['main', 'develop'])).toThrow(ValidationError)
  })

  it('should throw ValidationError for non-object input (boolean)', () => {
    expect(() => parseInspectSession(true)).toThrow(ValidationError)
  })
})
