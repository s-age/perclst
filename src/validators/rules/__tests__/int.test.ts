import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock the zod module
vi.mock('zod', () => {
  const intResult = { min: vi.fn(), max: vi.fn() }
  intResult.min.mockReturnValue(intResult)
  intResult.max.mockReturnValue(intResult)

  const mockInt = vi.fn(() => intResult)
  const mockNumber = vi.fn(() => ({ int: mockInt }))

  return {
    z: {
      coerce: {
        number: mockNumber
      }
    }
  }
})

import { intRule } from '../int'
import { z } from 'zod'

describe('intRule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a basic integer schema without options', () => {
    intRule()

    expect(z.coerce.number).toHaveBeenCalled()
    const numberMock = z.coerce.number as ReturnType<typeof vi.fn>
    const numberResult = numberMock.mock.results[0].value
    expect(numberResult.int).toHaveBeenCalled()
  })

  it('chains min method when min option is provided', () => {
    intRule({ min: 5 })

    const numberMock = z.coerce.number as ReturnType<typeof vi.fn>
    const numberResult = numberMock.mock.results[0].value
    const intResult = numberResult.int.mock.results[0].value

    expect(intResult.min).toHaveBeenCalledWith(5)
  })

  it('chains max method when max option is provided', () => {
    intRule({ max: 100 })

    const numberMock = z.coerce.number as ReturnType<typeof vi.fn>
    const numberResult = numberMock.mock.results[0].value
    const intResult = numberResult.int.mock.results[0].value

    expect(intResult.max).toHaveBeenCalledWith(100)
  })

  it('chains both min and max methods when both options are provided', () => {
    intRule({ min: 10, max: 50 })

    const numberMock = z.coerce.number as ReturnType<typeof vi.fn>
    const numberResult = numberMock.mock.results[0].value
    const intResult = numberResult.int.mock.results[0].value

    expect(intResult.min).toHaveBeenCalledWith(10)
    expect(intResult.max).toHaveBeenCalledWith(50)
  })

  it('does not chain min when min is undefined', () => {
    intRule({ max: 100 })

    const numberMock = z.coerce.number as ReturnType<typeof vi.fn>
    const numberResult = numberMock.mock.results[0].value
    const intResult = numberResult.int.mock.results[0].value

    expect(intResult.min).not.toHaveBeenCalled()
    expect(intResult.max).toHaveBeenCalledWith(100)
  })

  it('does not chain max when max is undefined', () => {
    intRule({ min: 10 })

    const numberMock = z.coerce.number as ReturnType<typeof vi.fn>
    const numberResult = numberMock.mock.results[0].value
    const intResult = numberResult.int.mock.results[0].value

    expect(intResult.min).toHaveBeenCalledWith(10)
    expect(intResult.max).not.toHaveBeenCalled()
  })
})
