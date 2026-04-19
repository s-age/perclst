import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock the zod module
vi.mock('zod', () => ({
  z: {
    boolean: vi.fn()
  }
}))

import { booleanRule } from '../boolean'
import { z } from 'zod'

describe('booleanRule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call z.boolean() when invoked', () => {
    const mockBooleanSchema = {}
    vi.mocked(z.boolean).mockReturnValue(mockBooleanSchema)

    booleanRule()

    expect(z.boolean).toHaveBeenCalledTimes(1)
  })

  it('should call z.boolean() with no arguments', () => {
    const mockBooleanSchema = {}
    vi.mocked(z.boolean).mockReturnValue(mockBooleanSchema)

    booleanRule()

    expect(z.boolean).toHaveBeenCalledWith()
  })

  it('should return the schema object returned by z.boolean()', () => {
    const mockBooleanSchema = { parse: vi.fn() }
    vi.mocked(z.boolean).mockReturnValue(mockBooleanSchema)

    const result = booleanRule()

    expect(result).toBe(mockBooleanSchema)
  })

  it('should return a new schema instance each time it is called', () => {
    const mockSchema1 = { id: 1 }
    const mockSchema2 = { id: 2 }
    const mockBooleanSchemas = [mockSchema1, mockSchema2]

    vi.mocked(z.boolean).mockImplementation(() => mockBooleanSchemas.shift() || {})

    const result1 = booleanRule()
    const result2 = booleanRule()

    expect(result1).toBe(mockSchema1)
    expect(result2).toBe(mockSchema2)
    expect(result1).not.toBe(result2)
  })
})
