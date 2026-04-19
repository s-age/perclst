import { describe, it, expect } from 'vitest'
import { formatRule } from '../format'

describe('formatRule', () => {
  it('should validate text format value', () => {
    const schema = formatRule()
    const result = schema.safeParse('text')

    expect(result.success).toBe(true)
    expect(result.data).toBe('text')
  })

  it('should validate json format value', () => {
    const schema = formatRule()
    const result = schema.safeParse('json')

    expect(result.success).toBe(true)
    expect(result.data).toBe('json')
  })

  it('should reject invalid format values', () => {
    const schema = formatRule()
    const result = schema.safeParse('invalid')

    expect(result.success).toBe(false)
  })

  it('should apply default value of text when parsing undefined', () => {
    const schema = formatRule()
    const result = schema.safeParse(undefined)

    expect(result.success).toBe(true)
    expect(result.data).toBe('text')
  })
})
