import { vi, describe, it, expect, beforeEach } from 'vitest'
import { parseChatSession } from '../chatSession'

// Mock the schema module
vi.mock('../../schema', () => ({
  schema: vi.fn((obj) => obj),
  safeParse: vi.fn()
}))

// Mock the string rule module
vi.mock('../../rules/string', () => ({
  stringRule: vi.fn(() => ({ optional: vi.fn() }))
}))

import { safeParse } from '../../schema'

describe('parseChatSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return parsed session when safeParse succeeds with valid sessionId', () => {
    const validInput = { sessionId: 'session-123' }
    const expectedOutput = { sessionId: 'session-123' }

    vi.mocked(safeParse).mockReturnValue(expectedOutput)

    const result = parseChatSession(validInput)

    expect(result).toEqual(expectedOutput)
  })

  it('should call safeParse with the raw input', () => {
    const validInput = { sessionId: 'session-456' }

    vi.mocked(safeParse).mockReturnValue({ sessionId: 'session-456' })

    parseChatSession(validInput)

    expect(safeParse).toHaveBeenCalledWith(expect.anything(), validInput)
  })

  it('should propagate error when safeParse throws validation error', () => {
    const validationError = new Error('sessionId is required')

    vi.mocked(safeParse).mockImplementation(() => {
      throw validationError
    })

    expect(() => {
      parseChatSession({})
    }).toThrow(validationError)
  })

  it('should propagate error with custom message when field is missing', () => {
    const error = new Error('Invalid input: missing required field sessionId')

    vi.mocked(safeParse).mockImplementation(() => {
      throw error
    })

    expect(() => {
      parseChatSession({ otherField: 'value' })
    }).toThrow('Invalid input: missing required field sessionId')
  })

  it('should propagate error when sessionId has invalid type', () => {
    const typeError = new Error('sessionId must be a string')

    vi.mocked(safeParse).mockImplementation(() => {
      throw typeError
    })

    expect(() => {
      parseChatSession({ sessionId: 123 })
    }).toThrow('sessionId must be a string')
  })

  it('should handle null input by propagating safeParse error', () => {
    const nullError = new Error('Expected object')

    vi.mocked(safeParse).mockImplementation(() => {
      throw nullError
    })

    expect(() => {
      parseChatSession(null)
    }).toThrow('Expected object')
  })

  it('should handle undefined input by propagating safeParse error', () => {
    const undefinedError = new Error('Input cannot be undefined')

    vi.mocked(safeParse).mockImplementation(() => {
      throw undefinedError
    })

    expect(() => {
      parseChatSession(undefined)
    }).toThrow('Input cannot be undefined')
  })

  it('should return parsed result with sessionId when safeParse succeeds', () => {
    const input = { sessionId: 'uuid-1234-5678' }
    const output = { sessionId: 'uuid-1234-5678' }

    vi.mocked(safeParse).mockReturnValue(output)

    const result = parseChatSession(input)

    expect(result).toHaveProperty('sessionId')
    expect(result.sessionId).toBe('uuid-1234-5678')
  })

  it('should return different valid sessionIds without mutation', () => {
    const firstInput = { sessionId: 'first-id' }
    const secondInput = { sessionId: 'second-id' }

    vi.mocked(safeParse)
      .mockReturnValueOnce({ sessionId: 'first-id' })
      .mockReturnValueOnce({ sessionId: 'second-id' })

    const firstResult = parseChatSession(firstInput)
    const secondResult = parseChatSession(secondInput)

    expect(firstResult.sessionId).toBe('first-id')
    expect(secondResult.sessionId).toBe('second-id')
  })

  it('should propagate error when safeParse encounters generic error', () => {
    const genericError = new Error('Unexpected parsing failure')

    vi.mocked(safeParse).mockImplementation(() => {
      throw genericError
    })

    expect(() => {
      parseChatSession({ sessionId: 'test' })
    }).toThrow('Unexpected parsing failure')
  })

  it('should accept string sessionId and return it unchanged', () => {
    const sessionId = 'valid-session-id-with-dashes'
    const input = { sessionId }
    const expectedOutput = { sessionId }

    vi.mocked(safeParse).mockReturnValue(expectedOutput)

    const result = parseChatSession(input)

    expect(result.sessionId).toBe(sessionId)
  })
})
