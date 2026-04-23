import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { knowledgeSearchParams } from '../knowledgeSearch'

describe('knowledgeSearchParams schema', () => {
  const schema = z.object(knowledgeSearchParams)

  describe('valid inputs', () => {
    it('accepts query string only', () => {
      const input = { query: 'fork session' }
      const result = schema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({ query: 'fork session' })
      }
    })

    it('accepts query with AND operator', () => {
      const input = { query: 'fork AND session' }
      const result = schema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.query).toBe('fork AND session')
      }
    })

    it('accepts query with OR operator', () => {
      const input = { query: 'zod OR validation' }
      const result = schema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.query).toBe('zod OR validation')
      }
    })

    it('accepts query with include_draft false', () => {
      const input = { query: 'test', include_draft: false }
      const result = schema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({ query: 'test', include_draft: false })
      }
    })

    it('accepts query with include_draft true', () => {
      const input = { query: 'test', include_draft: true }
      const result = schema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({ query: 'test', include_draft: true })
      }
    })

    it('accepts empty string query', () => {
      const input = { query: '' }
      const result = schema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.query).toBe('')
      }
    })

    it('accepts very long query string', () => {
      const longQuery = 'a'.repeat(1000)
      const input = { query: longQuery }
      const result = schema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.query).toBe(longQuery)
      }
    })

    it('accepts query with special characters', () => {
      const input = { query: 'fork/session.ts (test)' }
      const result = schema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.query).toBe('fork/session.ts (test)')
      }
    })

    it('ignores extra fields', () => {
      const input = { query: 'test', include_draft: false, extra: 'ignored' }
      const result = schema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({ query: 'test', include_draft: false })
        expect('extra' in result.data).toBe(false)
      }
    })
  })

  describe('invalid inputs', () => {
    it('rejects missing query field', () => {
      const input = {}
      const result = schema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_type')
        expect(result.error.issues[0].path).toContain('query')
      }
    })

    it('rejects null query', () => {
      const input = { query: null }
      const result = schema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_type')
      }
    })

    it('rejects undefined query', () => {
      const input = { query: undefined }
      const result = schema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects numeric query', () => {
      const input = { query: 123 }
      const result = schema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_type')
      }
    })

    it('rejects boolean query', () => {
      const input = { query: true }
      const result = schema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects array query', () => {
      const input = { query: ['fork', 'session'] }
      const result = schema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects object query', () => {
      const input = { query: { search: 'fork' } }
      const result = schema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects non-boolean include_draft', () => {
      const input = { query: 'test', include_draft: 'true' }
      const result = schema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_type')
        expect(result.error.issues[0].path).toContain('include_draft')
      }
    })

    it('rejects numeric include_draft', () => {
      const input = { query: 'test', include_draft: 1 }
      const result = schema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects null include_draft when provided', () => {
      const input = { query: 'test', include_draft: null }
      const result = schema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('preserves whitespace in query', () => {
      const input = { query: '  fork   session  ' }
      const result = schema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.query).toBe('  fork   session  ')
      }
    })

    it('accepts newlines in query', () => {
      const input = { query: 'fork\nsession' }
      const result = schema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.query).toBe('fork\nsession')
      }
    })

    it('accepts unicode characters in query', () => {
      const input = { query: 'fork 会话 🚀' }
      const result = schema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.query).toBe('fork 会话 🚀')
      }
    })

    it('omit include_draft leaves it undefined in output', () => {
      const input = { query: 'test' }
      const result = schema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.include_draft).toBeUndefined()
      }
    })
  })

  describe('type safety', () => {
    it('exports knowledgeSearchParams shape', () => {
      expect(knowledgeSearchParams).toBeDefined()
      expect(knowledgeSearchParams).toHaveProperty('query')
      expect(knowledgeSearchParams).toHaveProperty('include_draft')
    })

    it('query property is a Zod string schema', () => {
      const querySchema = knowledgeSearchParams.query
      expect(querySchema).toBeDefined()
      // Test that it behaves like a Zod schema
      const result = querySchema.safeParse('test')
      expect(result.success).toBe(true)
    })

    it('include_draft property is a Zod optional boolean schema', () => {
      const draftSchema = knowledgeSearchParams.include_draft
      expect(draftSchema).toBeDefined()
      // Test that it accepts booleans
      expect(draftSchema.safeParse(true).success).toBe(true)
      expect(draftSchema.safeParse(false).success).toBe(true)
      // Test that it's optional (accepts undefined)
      expect(draftSchema.safeParse(undefined).success).toBe(true)
    })
  })
})
