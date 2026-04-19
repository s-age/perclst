import { describe, it, expect } from 'vitest'
import { stringArrayRule } from '../stringArray'

describe('stringArrayRule', () => {
  const schema = stringArrayRule()

  describe('valid inputs', () => {
    it('accepts an empty array', () => {
      const result = schema.safeParse([])
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual([])
      }
    })

    it('accepts an array with a single string', () => {
      const result = schema.safeParse(['hello'])
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(['hello'])
      }
    })

    it('accepts an array with multiple strings', () => {
      const result = schema.safeParse(['foo', 'bar', 'baz'])
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(['foo', 'bar', 'baz'])
      }
    })

    it('accepts an array with empty strings', () => {
      const result = schema.safeParse(['', 'text', ''])
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(['', 'text', ''])
      }
    })

    it('accepts an array with whitespace-only strings', () => {
      const result = schema.safeParse(['   ', '\t', '\n'])
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(['   ', '\t', '\n'])
      }
    })
  })

  describe('invalid inputs - wrong type', () => {
    it('rejects null', () => {
      const result = schema.safeParse(null)
      expect(result.success).toBe(false)
    })

    it('rejects undefined', () => {
      const result = schema.safeParse(undefined)
      expect(result.success).toBe(false)
    })

    it('rejects a string', () => {
      const result = schema.safeParse('not-an-array')
      expect(result.success).toBe(false)
    })

    it('rejects a number', () => {
      const result = schema.safeParse(42)
      expect(result.success).toBe(false)
    })

    it('rejects a boolean', () => {
      const result = schema.safeParse(true)
      expect(result.success).toBe(false)
    })

    it('rejects an object', () => {
      const result = schema.safeParse({ key: 'value' })
      expect(result.success).toBe(false)
    })
  })

  describe('invalid inputs - array with non-strings', () => {
    it('rejects an array with a number', () => {
      const result = schema.safeParse(['valid', 42])
      expect(result.success).toBe(false)
    })

    it('rejects an array with null', () => {
      const result = schema.safeParse(['valid', null])
      expect(result.success).toBe(false)
    })

    it('rejects an array with undefined', () => {
      const result = schema.safeParse(['valid', undefined])
      expect(result.success).toBe(false)
    })

    it('rejects an array with a boolean', () => {
      const result = schema.safeParse(['valid', false])
      expect(result.success).toBe(false)
    })

    it('rejects an array with an object', () => {
      const result = schema.safeParse(['valid', { nested: 'object' }])
      expect(result.success).toBe(false)
    })

    it('rejects an array with a nested array', () => {
      const result = schema.safeParse(['valid', ['nested']])
      expect(result.success).toBe(false)
    })

    it('rejects an array with all non-strings', () => {
      const result = schema.safeParse([42, null, true, { key: 'value' }])
      expect(result.success).toBe(false)
    })
  })

  describe('coercion behavior', () => {
    it('does not coerce numbers to strings', () => {
      const result = schema.safeParse([1, 2, 3])
      expect(result.success).toBe(false)
    })

    it('does not coerce booleans to strings', () => {
      const result = schema.safeParse([true, false])
      expect(result.success).toBe(false)
    })
  })
})
