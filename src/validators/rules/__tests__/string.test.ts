import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { stringRule } from '../string'

describe('stringRule', () => {
  describe('basic schema creation', () => {
    it('should return a zod string schema with default options', () => {
      const schema = stringRule()
      expect(schema).toBeInstanceOf(z.ZodString)
    })

    it('should return a zod string schema with empty options object', () => {
      const schema = stringRule({})
      expect(schema).toBeInstanceOf(z.ZodString)
    })

    it('should validate simple string without constraints', () => {
      const schema = stringRule()
      expect(schema.safeParse('hello').success).toBe(true)
      expect(schema.safeParse('').success).toBe(true)
      expect(schema.safeParse('a').success).toBe(true)
    })

    it('should reject non-string values', () => {
      const schema = stringRule()
      expect(schema.safeParse(123).success).toBe(false)
      expect(schema.safeParse(null).success).toBe(false)
      expect(schema.safeParse(undefined).success).toBe(false)
    })
  })

  describe('required option', () => {
    it('should enforce min length of 1 when required is true', () => {
      const schema = stringRule({ required: true })
      expect(schema.safeParse('hello').success).toBe(true)
      expect(schema.safeParse('a').success).toBe(true)
      expect(schema.safeParse('').success).toBe(false)
    })

    it('should not enforce min length when required is false', () => {
      const schema = stringRule({ required: false })
      expect(schema.safeParse('').success).toBe(true)
      expect(schema.safeParse('hello').success).toBe(true)
    })

    it('should not enforce min length when required is undefined', () => {
      const schema = stringRule({ required: undefined })
      expect(schema.safeParse('').success).toBe(true)
    })
  })

  describe('min option', () => {
    it('should enforce minimum length when min is specified', () => {
      const schema = stringRule({ min: 5 })
      expect(schema.safeParse('hello').success).toBe(true)
      expect(schema.safeParse('hi').success).toBe(false)
      expect(schema.safeParse('ab').success).toBe(false)
    })

    it('should handle min: 0', () => {
      const schema = stringRule({ min: 0 })
      expect(schema.safeParse('').success).toBe(true)
      expect(schema.safeParse('hello').success).toBe(true)
    })

    it('should handle min: 1', () => {
      const schema = stringRule({ min: 1 })
      expect(schema.safeParse('').success).toBe(false)
      expect(schema.safeParse('a').success).toBe(true)
    })

    it('should not apply constraint when min is undefined', () => {
      const schema = stringRule({ min: undefined })
      expect(schema.safeParse('').success).toBe(true)
      expect(schema.safeParse('hello').success).toBe(true)
    })
  })

  describe('max option', () => {
    it('should enforce maximum length when max is specified', () => {
      const schema = stringRule({ max: 5 })
      expect(schema.safeParse('hello').success).toBe(true)
      expect(schema.safeParse('hello world').success).toBe(false)
      expect(schema.safeParse('toolong').success).toBe(false)
    })

    it('should handle max: 1', () => {
      const schema = stringRule({ max: 1 })
      expect(schema.safeParse('').success).toBe(true)
      expect(schema.safeParse('a').success).toBe(true)
      expect(schema.safeParse('ab').success).toBe(false)
    })

    it('should not apply constraint when max is undefined', () => {
      const schema = stringRule({ max: undefined })
      expect(schema.safeParse('hello').success).toBe(true)
      expect(schema.safeParse('a very long string').success).toBe(true)
    })
  })

  describe('combined constraints', () => {
    it('should enforce both min and max constraints', () => {
      const schema = stringRule({ min: 2, max: 5 })
      expect(schema.safeParse('a').success).toBe(false)
      expect(schema.safeParse('hi').success).toBe(true)
      expect(schema.safeParse('hello').success).toBe(true)
      expect(schema.safeParse('hello!').success).toBe(false)
    })

    it('should enforce required and min constraints', () => {
      const schema = stringRule({ required: true, min: 3 })
      expect(schema.safeParse('').success).toBe(false)
      expect(schema.safeParse('a').success).toBe(false)
      expect(schema.safeParse('abc').success).toBe(true)
    })

    it('should enforce required and max constraints', () => {
      const schema = stringRule({ required: true, max: 3 })
      expect(schema.safeParse('').success).toBe(false)
      expect(schema.safeParse('a').success).toBe(true)
      expect(schema.safeParse('abcd').success).toBe(false)
    })

    it('should enforce all constraints together', () => {
      const schema = stringRule({ required: true, min: 2, max: 5 })
      expect(schema.safeParse('').success).toBe(false)
      expect(schema.safeParse('a').success).toBe(false)
      expect(schema.safeParse('ab').success).toBe(true)
      expect(schema.safeParse('hello').success).toBe(true)
      expect(schema.safeParse('hello!').success).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle large min values', () => {
      const schema = stringRule({ min: 1000 })
      const shortString = 'a'.repeat(999)
      const longString = 'a'.repeat(1000)
      expect(schema.safeParse(shortString).success).toBe(false)
      expect(schema.safeParse(longString).success).toBe(true)
    })

    it('should handle large max values', () => {
      const schema = stringRule({ max: 100000 })
      const longString = 'a'.repeat(100000)
      expect(schema.safeParse(longString).success).toBe(true)
    })

    it('should handle whitespace-only strings without required', () => {
      const schema = stringRule()
      expect(schema.safeParse('   ').success).toBe(true)
      expect(schema.safeParse('\t').success).toBe(true)
      expect(schema.safeParse('\n').success).toBe(true)
    })

    it('should handle whitespace-only strings with required', () => {
      const schema = stringRule({ required: true })
      expect(schema.safeParse('   ').success).toBe(true)
      expect(schema.safeParse('\t').success).toBe(true)
    })

    it('should validate at exact boundary values', () => {
      const schema = stringRule({ min: 3, max: 5 })
      const twoChars = 'ab'
      const threeChars = 'abc'
      const fiveChars = 'abcde'
      const sixChars = 'abcdef'

      expect(schema.safeParse(twoChars).success).toBe(false)
      expect(schema.safeParse(threeChars).success).toBe(true)
      expect(schema.safeParse(fiveChars).success).toBe(true)
      expect(schema.safeParse(sixChars).success).toBe(false)
    })
  })

  describe('chaining behavior', () => {
    it('should return a zod schema that can be further chained', () => {
      const schema = stringRule({ min: 2 }).email()
      expect(schema.safeParse('valid@email.com').success).toBe(true)
      expect(schema.safeParse('a').success).toBe(false) // too short
      expect(schema.safeParse('invalid').success).toBe(false) // not email
    })

    it('should return a zod schema that can be refined', () => {
      const schema = stringRule({ max: 10 }).refine((s) => s !== 'forbidden', {
        message: 'forbidden value'
      })
      expect(schema.safeParse('allowed').success).toBe(true)
      expect(schema.safeParse('forbidden').success).toBe(false)
    })
  })
})
