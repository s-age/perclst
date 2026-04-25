import { vi, describe, it, expect, beforeEach } from 'vitest'
import { stringRule } from '../string'

type MockZodString = {
  min: ReturnType<typeof vi.fn>
  max: ReturnType<typeof vi.fn>
}

const createMockStringInstance = (): MockZodString => ({
  min: vi.fn().mockReturnThis(),
  max: vi.fn().mockReturnThis()
})

// Zod v4 tightened its internal types; cast via unknown to bypass strict schema type checks in mocks
const mockString = (instance: MockZodString): void => {
  vi.mocked(z.string).mockReturnValue(instance as unknown as ReturnType<typeof z.string>)
}

// Mock the zod module
vi.mock('zod', () => ({
  z: {
    string: vi.fn(() => createMockStringInstance())
  }
}))

// Import after mocking to get the mocked version
import { z } from 'zod'

describe('stringRule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a base string schema with no options', () => {
    const mockStringInstance = createMockStringInstance()
    mockString(mockStringInstance)

    stringRule()

    expect(z.string).toHaveBeenCalledTimes(1)
    expect(z.string).toHaveBeenCalledWith()
  })

  it('should apply min(1) when required option is true', () => {
    const mockStringInstance = createMockStringInstance()
    mockString(mockStringInstance)

    stringRule({ required: true })

    expect(mockStringInstance.min).toHaveBeenCalledWith(1)
  })

  it('should not apply min(1) when required option is false', () => {
    const mockStringInstance = createMockStringInstance()
    mockString(mockStringInstance)

    stringRule({ required: false })

    // min should not be called since required is false
    expect(mockStringInstance.min).not.toHaveBeenCalled()
  })

  it('should apply min constraint when min option is provided', () => {
    const mockStringInstance = createMockStringInstance()
    mockString(mockStringInstance)

    stringRule({ min: 5 })

    expect(mockStringInstance.min).toHaveBeenCalledWith(5)
  })

  it('should not apply min constraint when min is undefined', () => {
    const mockStringInstance = createMockStringInstance()
    mockString(mockStringInstance)

    stringRule({ min: undefined })

    expect(mockStringInstance.min).not.toHaveBeenCalled()
  })

  it('should apply max constraint when max option is provided', () => {
    const mockStringInstance = createMockStringInstance()
    mockString(mockStringInstance)

    stringRule({ max: 100 })

    expect(mockStringInstance.max).toHaveBeenCalledWith(100)
  })

  it('should not apply max constraint when max is undefined', () => {
    const mockStringInstance = createMockStringInstance()
    mockString(mockStringInstance)

    stringRule({ max: undefined })

    expect(mockStringInstance.max).not.toHaveBeenCalled()
  })

  it('should apply both required and custom min when required=true and min provided', () => {
    const mockStringInstance = createMockStringInstance()
    mockString(mockStringInstance)

    stringRule({ required: true, min: 3 })

    // min should be called twice: once for required, once for the explicit min
    expect(mockStringInstance.min).toHaveBeenCalledTimes(2)
    expect(mockStringInstance.min).toHaveBeenNthCalledWith(1, 1)
    expect(mockStringInstance.min).toHaveBeenNthCalledWith(2, 3)
  })

  it('should apply required, min, and max constraints together', () => {
    const mockStringInstance = createMockStringInstance()
    mockString(mockStringInstance)

    stringRule({ required: true, min: 2, max: 50 })

    expect(mockStringInstance.min).toHaveBeenCalledTimes(2)
    expect(mockStringInstance.min).toHaveBeenNthCalledWith(1, 1)
    expect(mockStringInstance.min).toHaveBeenNthCalledWith(2, 2)
    expect(mockStringInstance.max).toHaveBeenCalledWith(50)
  })

  it('should apply only min and max without required', () => {
    const mockStringInstance = createMockStringInstance()
    mockString(mockStringInstance)

    stringRule({ min: 1, max: 100 })

    expect(mockStringInstance.min).toHaveBeenCalledTimes(1)
    expect(mockStringInstance.min).toHaveBeenCalledWith(1)
    expect(mockStringInstance.max).toHaveBeenCalledWith(100)
  })

  it('should return the chained schema object', () => {
    const mockStringInstance = createMockStringInstance()
    mockString(mockStringInstance)

    const result = stringRule({ min: 5, max: 20 })

    expect(result).toBe(mockStringInstance)
  })

  it('should handle min value of 0', () => {
    const mockStringInstance = createMockStringInstance()
    mockString(mockStringInstance)

    stringRule({ min: 0 })

    expect(mockStringInstance.min).toHaveBeenCalledWith(0)
  })

  it('should handle max value of 0', () => {
    const mockStringInstance = createMockStringInstance()
    mockString(mockStringInstance)

    stringRule({ max: 0 })

    expect(mockStringInstance.max).toHaveBeenCalledWith(0)
  })

  it('should apply constraints in correct order: required then min then max', () => {
    const callOrder: string[] = []
    const mockStringInstance: MockZodString = {
      min: vi.fn(() => {
        callOrder.push('min')
        return mockStringInstance
      }),
      max: vi.fn(() => {
        callOrder.push('max')
        return mockStringInstance
      })
    }
    mockString(mockStringInstance)

    stringRule({ required: true, min: 5, max: 20 })

    // The order should be: required (min call), then explicit min, then max
    expect(callOrder).toEqual(['min', 'min', 'max'])
  })
})
