import { describe, it, expect } from 'vitest'
import { generateId } from '../uuid.js'

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe('generateId (real crypto.randomUUID)', () => {
  it('returns a valid UUID v4 string', () => {
    expect(generateId()).toMatch(UUID_V4_REGEX)
  })

  it('returns a different value on each call', () => {
    expect(generateId()).not.toBe(generateId())
  })
})
