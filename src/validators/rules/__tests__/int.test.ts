import { describe, it, expect } from 'vitest'
import { intRule } from '../int'

describe('intRule', () => {
  describe('basic integer validation (no constraints)', () => {
    it('should parse valid integers', () => {
      const schema = intRule()
      expect(schema.parse(42)).toBe(42)
      expect(schema.parse(0)).toBe(0)
      expect(schema.parse(-5)).toBe(-5)
    })

    it('should coerce strings to integers', () => {
      const schema = intRule()
      expect(schema.parse('42')).toBe(42)
      expect(schema.parse('0')).toBe(0)
      expect(schema.parse('-5')).toBe(-5)
    })

    it('should reject decimal numbers', () => {
      const schema = intRule()
      expect(() => schema.parse(42.5)).toThrow()
      expect(() => schema.parse(42.9)).toThrow()
      expect(() => schema.parse(-5.7)).toThrow()
    })

    it('should coerce null to zero', () => {
      const schema = intRule()
      expect(schema.parse(null)).toBe(0)
    })

    it('should reject undefined', () => {
      const schema = intRule()
      expect(() => schema.parse(undefined)).toThrow()
    })

    it('should reject non-numeric strings', () => {
      const schema = intRule()
      expect(() => schema.parse('abc')).toThrow()
      expect(() => schema.parse('not a number')).toThrow()
    })
  })

  describe('min constraint', () => {
    it('should accept values greater than or equal to min', () => {
      const schema = intRule({ min: 10 })
      expect(schema.parse(10)).toBe(10)
      expect(schema.parse(11)).toBe(11)
      expect(schema.parse(100)).toBe(100)
    })

    it('should reject values less than min', () => {
      const schema = intRule({ min: 10 })
      expect(() => schema.parse(9)).toThrow()
      expect(() => schema.parse(0)).toThrow()
      expect(() => schema.parse(-1)).toThrow()
    })

    it('should handle zero as min boundary', () => {
      const schema = intRule({ min: 0 })
      expect(schema.parse(0)).toBe(0)
      expect(schema.parse(1)).toBe(1)
      expect(() => schema.parse(-1)).toThrow()
    })

    it('should handle negative min boundary', () => {
      const schema = intRule({ min: -50 })
      expect(schema.parse(-50)).toBe(-50)
      expect(schema.parse(-49)).toBe(-49)
      expect(() => schema.parse(-51)).toThrow()
    })
  })

  describe('max constraint', () => {
    it('should accept values less than or equal to max', () => {
      const schema = intRule({ max: 100 })
      expect(schema.parse(100)).toBe(100)
      expect(schema.parse(99)).toBe(99)
      expect(schema.parse(0)).toBe(0)
    })

    it('should reject values greater than max', () => {
      const schema = intRule({ max: 100 })
      expect(() => schema.parse(101)).toThrow()
      expect(() => schema.parse(1000)).toThrow()
    })

    it('should handle zero as max boundary', () => {
      const schema = intRule({ max: 0 })
      expect(schema.parse(0)).toBe(0)
      expect(schema.parse(-1)).toBe(-1)
      expect(() => schema.parse(1)).toThrow()
    })

    it('should handle negative max boundary', () => {
      const schema = intRule({ max: -10 })
      expect(schema.parse(-10)).toBe(-10)
      expect(schema.parse(-11)).toBe(-11)
      expect(() => schema.parse(-9)).toThrow()
    })
  })

  describe('combined constraints', () => {
    it('should accept values within [min, max] range', () => {
      const schema = intRule({ min: 10, max: 20 })
      expect(schema.parse(10)).toBe(10)
      expect(schema.parse(15)).toBe(15)
      expect(schema.parse(20)).toBe(20)
    })

    it('should reject values below min', () => {
      const schema = intRule({ min: 10, max: 20 })
      expect(() => schema.parse(9)).toThrow()
    })

    it('should reject values above max', () => {
      const schema = intRule({ min: 10, max: 20 })
      expect(() => schema.parse(21)).toThrow()
    })

    it('should coerce and validate with constraints', () => {
      const schema = intRule({ min: 10, max: 50 })
      expect(schema.parse('42')).toBe(42)
      expect(schema.parse(25)).toBe(25)
      expect(() => schema.parse('9')).toThrow()
      expect(() => schema.parse('51')).toThrow()
    })
  })

  describe('edge cases', () => {
    it('should handle large safe integers', () => {
      const schema = intRule()
      const largeNum = Number.MAX_SAFE_INTEGER
      expect(schema.parse(largeNum)).toBe(largeNum)
    })

    it('should handle small safe integers', () => {
      const schema = intRule()
      const smallNum = Number.MIN_SAFE_INTEGER
      expect(schema.parse(smallNum)).toBe(smallNum)
    })

    it('should coerce scientific notation', () => {
      const schema = intRule()
      expect(schema.parse(1e3)).toBe(1000)
    })
  })
})
