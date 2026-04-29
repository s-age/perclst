import { vi, describe, it, expect, beforeEach } from 'vitest'
import { parseListSessions, type ListSessionsInput } from '../listSessions'
import * as schemaModule from '../../schema'

vi.mock('../../schema', () => ({
  schema: vi.fn(() => ({
    _output: {},
    parse: vi.fn()
  })),
  safeParse: vi.fn()
}))

describe('parseListSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the result from safeParse', () => {
    const mockResult: ListSessionsInput = { label: 'test', like: 'pattern' }
    vi.mocked(schemaModule.safeParse).mockReturnValue(mockResult)

    const result = parseListSessions({ label: 'test' })

    expect(result).toEqual(mockResult)
    expect(schemaModule.safeParse).toHaveBeenCalledOnce()
  })

  it.each([
    ['plain object', { label: 'test' }],
    ['object with only like', { like: 'pattern' }],
    ['empty object', {}],
    ['null', null],
    ['undefined', undefined],
    ['number', 42],
    ['array', ['label', 'like']],
    ['object with extra fields', { label: 'test', extra: 'field', another: 123 }]
  ] as const)('accepts %s input unchanged', (_label, input) => {
    const mockResult: ListSessionsInput = {}
    vi.mocked(schemaModule.safeParse).mockReturnValue(mockResult)

    parseListSessions(input)

    const calls = vi.mocked(schemaModule.safeParse).mock.calls
    expect(calls[0][1]).toBe(input)
  })

  it('throws error when safeParse throws', () => {
    const error = new Error('Validation failed')
    vi.mocked(schemaModule.safeParse).mockImplementation(() => {
      throw error
    })

    expect(() => parseListSessions({ label: 'test' })).toThrow(error)
  })

  it('accepts input objects with long string values', () => {
    const longString = 'a'.repeat(10000)
    const mockResult: ListSessionsInput = { label: longString }
    vi.mocked(schemaModule.safeParse).mockReturnValue(mockResult)

    const input = { label: longString }
    const result = parseListSessions(input)

    expect(result.label).toBe(longString)
  })

  it('accepts input objects with special characters in fields', () => {
    const specialLabel = '!@#$%^&*()_+-=[]{}|;:,.<>?'
    const mockResult: ListSessionsInput = { label: specialLabel }
    vi.mocked(schemaModule.safeParse).mockReturnValue(mockResult)

    const input = { label: specialLabel }
    const result = parseListSessions(input)

    expect(result.label).toBe(specialLabel)
  })

  it('accepts input objects with unicode characters', () => {
    const unicodeLike = 'test data 🎉∑∫√'
    const mockResult: ListSessionsInput = { like: unicodeLike }
    vi.mocked(schemaModule.safeParse).mockReturnValue(mockResult)

    const input = { like: unicodeLike }
    const result = parseListSessions(input)

    expect(result.like).toBe(unicodeLike)
  })
})
