import { describe, it, expect } from 'vitest'
import { gitRefRule } from '../gitRef'

describe('gitRefRule', () => {
  const schema = gitRefRule()

  // Happy path: valid git references
  describe('valid refs', () => {
    it('accepts simple branch name', () => {
      const result = schema.safeParse('main')
      expect(result.success).toBe(true)
    })

    it('accepts branch with hyphens', () => {
      const result = schema.safeParse('feature-branch')
      expect(result.success).toBe(true)
    })

    it('accepts branch with underscores', () => {
      const result = schema.safeParse('feature_branch')
      expect(result.success).toBe(true)
    })

    it('accepts branch with slashes', () => {
      const result = schema.safeParse('feature/my-feature')
      expect(result.success).toBe(true)
    })

    it('accepts semver tag', () => {
      const result = schema.safeParse('v1.0.0')
      expect(result.success).toBe(true)
    })

    it('accepts nested path refs', () => {
      const result = schema.safeParse('release/v2.1.3')
      expect(result.success).toBe(true)
    })

    it('accepts commit SHA (40-char hex)', () => {
      const result = schema.safeParse('356a192b7913b04c54574d18c28d46e6395428ab')
      expect(result.success).toBe(true)
    })

    it('accepts short commit SHA', () => {
      const result = schema.safeParse('356a192b')
      expect(result.success).toBe(true)
    })

    it('accepts refs with multiple dots', () => {
      const result = schema.safeParse('v1.2.3.4')
      expect(result.success).toBe(true)
    })

    it('accepts refs with multiple slashes', () => {
      const result = schema.safeParse('bugfix/issue-123/attempt-2')
      expect(result.success).toBe(true)
    })
  })

  // Error path: empty string
  describe('empty string', () => {
    it('rejects empty string', () => {
      const result = schema.safeParse('')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('too_small')
      }
    })
  })

  // Error path: invalid characters
  describe('invalid characters', () => {
    it('rejects ref with space', () => {
      const result = schema.safeParse('feature branch')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_format')
      }
    })

    it('rejects ref with semicolon (shell metacharacter)', () => {
      const result = schema.safeParse('main; rm -rf /')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_format')
      }
    })

    it('rejects ref with pipe (shell metacharacter)', () => {
      const result = schema.safeParse('main | cat /etc/passwd')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_format')
      }
    })

    it('rejects ref with command substitution dollar sign', () => {
      const result = schema.safeParse('$(whoami)')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_format')
      }
    })

    it('rejects ref with backticks (command substitution)', () => {
      const result = schema.safeParse('`whoami`')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_format')
      }
    })

    it('rejects ref with ampersand', () => {
      const result = schema.safeParse('main&')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_format')
      }
    })

    it('rejects ref with greater-than (redirect)', () => {
      const result = schema.safeParse('main > /tmp/out')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_format')
      }
    })

    it('rejects ref with less-than (redirect)', () => {
      const result = schema.safeParse('main < /tmp/input')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_format')
      }
    })

    it('rejects ref with parentheses', () => {
      const result = schema.safeParse('feature(test)')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_format')
      }
    })

    it('rejects ref with square brackets', () => {
      const result = schema.safeParse('feature[test]')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_format')
      }
    })

    it('rejects ref with curly braces', () => {
      const result = schema.safeParse('feature{v1,v2}')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_format')
      }
    })

    it('rejects ref with asterisk (glob)', () => {
      const result = schema.safeParse('feature*')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_format')
      }
    })

    it('rejects ref with question mark (glob)', () => {
      const result = schema.safeParse('feature?')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_format')
      }
    })

    it('rejects ref with at-sign', () => {
      const result = schema.safeParse('feature@release')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_format')
      }
    })

    it('rejects ref with hash/pound', () => {
      const result = schema.safeParse('feature#123')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_format')
      }
    })

    it('rejects ref with colon', () => {
      const result = schema.safeParse('feature:main')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_format')
      }
    })

    it('rejects ref with caret', () => {
      const result = schema.safeParse('main^')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_format')
      }
    })

    it('rejects ref with tilde', () => {
      const result = schema.safeParse('main~1')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_format')
      }
    })

    it('rejects ref with exclamation mark', () => {
      const result = schema.safeParse('feature!')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_format')
      }
    })

    it('rejects ref with plus sign', () => {
      const result = schema.safeParse('feature+hotfix')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_format')
      }
    })

    it('rejects ref with equals sign', () => {
      const result = schema.safeParse('feature=main')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_format')
      }
    })
  })

  // Verify error message is helpful
  describe('error messages', () => {
    it('provides descriptive error message for invalid ref', () => {
      const result = schema.safeParse('feature; echo hacked')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'invalid git ref: only alphanumerics, dots, hyphens, underscores, and slashes are allowed'
        )
      }
    })
  })
})
