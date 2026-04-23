import { vi, describe, it, expect, beforeEach } from 'vitest'
import { parseTagSession } from '../tagSession'
import { ValidationError } from '@src/errors/validationError'

vi.mock('../../schema', () => ({
  schema: vi.fn((obj) => obj),
  safeParse: vi.fn()
}))

vi.mock('../../rules/string', () => ({
  stringRule: vi.fn()
}))

vi.mock('../../rules/stringArray', () => ({
  stringArrayRule: vi.fn()
}))

import { safeParse } from '../../schema'

describe('parseTagSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return parsed session when safeParse succeeds with valid sessionId and labels', () => {
    const validInput = { sessionId: 'session-123', labels: ['tag1', 'tag2'] }
    const expectedOutput = { sessionId: 'session-123', labels: ['tag1', 'tag2'] }

    vi.mocked(safeParse).mockReturnValue(expectedOutput)

    const result = parseTagSession(validInput)

    expect(result).toEqual(expectedOutput)
    expect(result.sessionId).toBe('session-123')
    expect(result.labels).toEqual(['tag1', 'tag2'])
  })

  it('should return parsed session with empty labels array', () => {
    const validInput = { sessionId: 'session-456', labels: [] }
    const expectedOutput = { sessionId: 'session-456', labels: [] }

    vi.mocked(safeParse).mockReturnValue(expectedOutput)

    const result = parseTagSession(validInput)

    expect(result).toEqual(expectedOutput)
    expect(result.labels).toEqual([])
  })

  it('should call safeParse with the raw input', () => {
    const validInput = { sessionId: 'session-789', labels: ['tag'] }

    vi.mocked(safeParse).mockReturnValue(validInput)

    parseTagSession(validInput)

    expect(safeParse).toHaveBeenCalledWith(expect.anything(), validInput)
  })

  it('should propagate error when safeParse throws ValidationError for missing sessionId', () => {
    const validationError = new ValidationError(
      'sessionId: String must contain at least 1 character'
    )

    vi.mocked(safeParse).mockImplementation(() => {
      throw validationError
    })

    expect(() => {
      parseTagSession({ labels: ['tag1'] })
    }).toThrow(ValidationError)

    expect(() => {
      parseTagSession({ labels: ['tag1'] })
    }).toThrow('sessionId')
  })

  it('should propagate error when sessionId is empty string', () => {
    const validationError = new ValidationError(
      'sessionId: String must contain at least 1 character'
    )

    vi.mocked(safeParse).mockImplementation(() => {
      throw validationError
    })

    expect(() => {
      parseTagSession({ sessionId: '', labels: ['tag1'] })
    }).toThrow(ValidationError)

    expect(() => {
      parseTagSession({ sessionId: '', labels: ['tag1'] })
    }).toThrow(/sessionId|empty|required/)
  })

  it('should propagate error when safeParse throws ValidationError for missing labels', () => {
    const validationError = new ValidationError('labels: Required')

    vi.mocked(safeParse).mockImplementation(() => {
      throw validationError
    })

    expect(() => {
      parseTagSession({ sessionId: 'abc-123' })
    }).toThrow(ValidationError)

    expect(() => {
      parseTagSession({ sessionId: 'abc-123' })
    }).toThrow('labels')
  })

  it('should propagate error when labels has invalid type', () => {
    const typeError = new ValidationError('labels: Expected array, received string')

    vi.mocked(safeParse).mockImplementation(() => {
      throw typeError
    })

    expect(() => {
      parseTagSession({ sessionId: 'abc-123', labels: 'not-array' })
    }).toThrow(ValidationError)

    expect(() => {
      parseTagSession({ sessionId: 'abc-123', labels: 'not-array' })
    }).toThrow(/labels|array/)
  })

  it('should propagate error when labels contains non-string element', () => {
    const typeError = new ValidationError('labels.1: Expected string, received number')

    vi.mocked(safeParse).mockImplementation(() => {
      throw typeError
    })

    expect(() => {
      parseTagSession({ sessionId: 'abc-123', labels: ['tag1', 42] })
    }).toThrow(ValidationError)

    expect(() => {
      parseTagSession({ sessionId: 'abc-123', labels: ['tag1', 42] })
    }).toThrow(/labels|string/)
  })

  it('should handle null input by propagating safeParse error', () => {
    const nullError = new ValidationError('input: Expected object, received null')

    vi.mocked(safeParse).mockImplementation(() => {
      throw nullError
    })

    expect(() => {
      parseTagSession(null)
    }).toThrow(ValidationError)

    expect(() => {
      parseTagSession(null)
    }).toThrow(/null|object/)
  })

  it('should handle undefined input by propagating safeParse error', () => {
    const undefinedError = new ValidationError('input: Expected object, received undefined')

    vi.mocked(safeParse).mockImplementation(() => {
      throw undefinedError
    })

    expect(() => {
      parseTagSession(undefined)
    }).toThrow(ValidationError)

    expect(() => {
      parseTagSession(undefined)
    }).toThrow(/undefined|object/)
  })

  it('should handle non-object input by propagating safeParse error', () => {
    const typeError = new ValidationError('input: Expected object, received string')

    vi.mocked(safeParse).mockImplementation(() => {
      throw typeError
    })

    expect(() => {
      parseTagSession('not-an-object')
    }).toThrow(ValidationError)

    expect(() => {
      parseTagSession('not-an-object')
    }).toThrow(/object|string/)
  })

  it('should propagate error when input is a number', () => {
    const typeError = new ValidationError('input: Expected object, received number')

    vi.mocked(safeParse).mockImplementation(() => {
      throw typeError
    })

    expect(() => {
      parseTagSession(42)
    }).toThrow(ValidationError)

    expect(() => {
      parseTagSession(42)
    }).toThrow(/object|number/)
  })

  it('should propagate error when input is an array', () => {
    const typeError = new ValidationError('input: Expected object, received array')

    vi.mocked(safeParse).mockImplementation(() => {
      throw typeError
    })

    expect(() => {
      parseTagSession(['sessionId', 'labels'])
    }).toThrow(ValidationError)

    expect(() => {
      parseTagSession(['sessionId', 'labels'])
    }).toThrow(/object|array/)
  })

  it('should return result without unknown properties', () => {
    const input = {
      sessionId: 'abc-123',
      labels: ['tag1'],
      unknownProp: 'should-be-ignored'
    }
    const output = { sessionId: 'abc-123', labels: ['tag1'] }

    vi.mocked(safeParse).mockReturnValue(output)

    const result = parseTagSession(input)

    expect(result).toEqual(output)
    expect(result).not.toHaveProperty('unknownProp')
  })

  it('should handle labels with special characters', () => {
    const input = {
      sessionId: 'abc-123',
      labels: ['tag-with-dashes', 'tag_with_underscores', 'tag.with.dots']
    }
    const output = input

    vi.mocked(safeParse).mockReturnValue(output)

    const result = parseTagSession(input)

    expect(result.labels).toEqual(['tag-with-dashes', 'tag_with_underscores', 'tag.with.dots'])
  })

  it('should handle labels with spaces', () => {
    const input = {
      sessionId: 'abc-123',
      labels: ['label one', 'label two']
    }
    const output = input

    vi.mocked(safeParse).mockReturnValue(output)

    const result = parseTagSession(input)

    expect(result.labels).toEqual(['label one', 'label two'])
  })

  it('should handle sessionId with special characters', () => {
    const input = {
      sessionId: 'session-abc-123-def_456',
      labels: ['tag']
    }
    const output = input

    vi.mocked(safeParse).mockReturnValue(output)

    const result = parseTagSession(input)

    expect(result.sessionId).toBe('session-abc-123-def_456')
  })

  it('should propagate error when safeParse encounters generic error', () => {
    const genericError = new ValidationError('Unexpected parsing failure')

    vi.mocked(safeParse).mockImplementation(() => {
      throw genericError
    })

    expect(() => {
      parseTagSession({ sessionId: 'test', labels: ['tag'] })
    }).toThrow(ValidationError)

    expect(() => {
      parseTagSession({ sessionId: 'test', labels: ['tag'] })
    }).toThrow('Unexpected parsing failure')
  })

  it('should return different valid inputs without mutation', () => {
    const firstInput = { sessionId: 'first-id', labels: ['tag1'] }
    const secondInput = { sessionId: 'second-id', labels: ['tag2', 'tag3'] }
    const firstOutput = firstInput
    const secondOutput = secondInput

    vi.mocked(safeParse).mockReturnValueOnce(firstOutput).mockReturnValueOnce(secondOutput)

    const firstResult = parseTagSession(firstInput)
    const secondResult = parseTagSession(secondInput)

    expect(firstResult.sessionId).toBe('first-id')
    expect(secondResult.sessionId).toBe('second-id')
    expect(firstResult.labels).toEqual(['tag1'])
    expect(secondResult.labels).toEqual(['tag2', 'tag3'])
  })
})
