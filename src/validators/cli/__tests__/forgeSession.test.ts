import { describe, it, expect } from 'vitest'
import { parseForgeSession } from '../forgeSession'
import { ValidationError } from '@src/errors/validationError'

describe('parseForgeSession', () => {
  describe('valid input', () => {
    it('accepts plans/ prefix path', () => {
      const result = parseForgeSession({ planFilePath: 'plans/cli-e2e-infra-di.md' })
      expect(result.planFilePath).toBe('plans/cli-e2e-infra-di.md')
    })

    it('accepts ./ prefix and normalizes it', () => {
      const result = parseForgeSession({ planFilePath: './plans/cli-e2e-infra-di.md' })
      expect(result.planFilePath).toBe('plans/cli-e2e-infra-di.md')
    })

    it('accepts nested path within plans/', () => {
      const result = parseForgeSession({ planFilePath: 'plans/subdir/feature.md' })
      expect(result.planFilePath).toBe('plans/subdir/feature.md')
    })
  })

  describe('path traversal', () => {
    it('throws ValidationError for .. segments', () => {
      expect(() => parseForgeSession({ planFilePath: '../etc/shadow.md' })).toThrow(ValidationError)
    })

    it('throws ValidationError for embedded ..', () => {
      expect(() => parseForgeSession({ planFilePath: 'plans/../secret.md' })).toThrow(
        ValidationError
      )
    })
  })

  describe('plans/ prefix enforcement', () => {
    it('throws ValidationError for absolute path', () => {
      expect(() => parseForgeSession({ planFilePath: '/absolute/plans/foo.md' })).toThrow(
        ValidationError
      )
    })

    it('throws ValidationError for path outside plans/', () => {
      expect(() => parseForgeSession({ planFilePath: 'src/something.md' })).toThrow(ValidationError)
    })
  })

  describe('extension enforcement', () => {
    it('throws ValidationError for non-.md file', () => {
      expect(() => parseForgeSession({ planFilePath: 'plans/foo.json' })).toThrow(ValidationError)
    })
  })

  describe('missing or invalid input', () => {
    it('throws ValidationError when planFilePath is missing', () => {
      expect(() => parseForgeSession({})).toThrow(ValidationError)
    })

    it('throws ValidationError when planFilePath is empty string', () => {
      expect(() => parseForgeSession({ planFilePath: '' })).toThrow(ValidationError)
    })

    it('throws ValidationError for non-object input', () => {
      expect(() => parseForgeSession(null)).toThrow(ValidationError)
    })

    it('throws ValidationError when planFilePath is not a string', () => {
      expect(() => parseForgeSession({ planFilePath: 42 })).toThrow(ValidationError)
    })
  })
})
