import { vi, describe, it, expect, beforeEach } from 'vitest'
import { generateId } from '../uuid.js'

vi.mock('crypto', () => ({
  randomUUID: vi.fn()
}))

import { randomUUID } from 'crypto'

const mockRandomUUID = vi.mocked(randomUUID)
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe('generateId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call randomUUID exactly once', () => {
    mockRandomUUID.mockReturnValue('550e8400-e29b-41d4-a716-446655440000')
    generateId()
    expect(mockRandomUUID).toHaveBeenCalledTimes(1)
  })

  it('should call randomUUID with no arguments', () => {
    mockRandomUUID.mockReturnValue('550e8400-e29b-41d4-a716-446655440000')
    generateId()
    expect(mockRandomUUID).toHaveBeenCalledWith()
  })

  it('should return the exact value from randomUUID', () => {
    const expectedUuid = '550e8400-e29b-41d4-a716-446655440000'
    mockRandomUUID.mockReturnValue(expectedUuid)
    const result = generateId()
    expect(result).toBe(expectedUuid)
  })

  it('returns a UUID v4 string matching format', () => {
    mockRandomUUID.mockReturnValue('550e8400-e29b-41d4-a716-446655440000')
    expect(generateId()).toMatch(UUID_V4_REGEX)
  })
})
