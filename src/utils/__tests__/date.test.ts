import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { now, toISO, toLocaleString, toTimestamp } from '../date'

const FIXED_ISO = '2024-06-15T12:00:00.000Z'
const FIXED_MS = new Date(FIXED_ISO).getTime()

describe('now', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(FIXED_ISO))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns a dayjs object', () => {
    const result = now()
    expect(result).toBeDefined()
    expect(typeof result.toISOString).toBe('function')
  })

  it('returns the current time', () => {
    expect(now().valueOf()).toBe(FIXED_MS)
  })
})

describe('toISO', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(FIXED_ISO))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('defaults to the current time when called with no argument', () => {
    expect(toISO()).toBe(FIXED_ISO)
  })

  it('returns the ISO 8601 string for a provided dayjs object', () => {
    const d = now()
    expect(toISO(d)).toBe(FIXED_ISO)
  })

  it('returns the ISO string for a different dayjs value', () => {
    const other = now().add(1, 'hour')
    expect(toISO(other)).toBe('2024-06-15T13:00:00.000Z')
  })
})

describe('toLocaleString', () => {
  it('returns a non-empty string for a valid ISO input', () => {
    const result = toLocaleString(FIXED_ISO)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('round-trips through the same timestamp', () => {
    const result = toLocaleString(FIXED_ISO)
    expect(new Date(result).getTime()).toBe(FIXED_MS)
  })

  it('produces different strings for different ISO inputs', () => {
    const a = toLocaleString('2024-01-01T00:00:00.000Z')
    const b = toLocaleString('2024-12-31T23:59:59.000Z')
    expect(a).not.toBe(b)
  })
})

describe('toTimestamp', () => {
  it('returns the correct Unix ms value', () => {
    expect(toTimestamp(FIXED_ISO)).toBe(FIXED_MS)
  })

  it('returns a number', () => {
    expect(typeof toTimestamp(FIXED_ISO)).toBe('number')
  })

  it('returns different values for different ISO strings', () => {
    const t1 = toTimestamp('2024-01-01T00:00:00.000Z')
    const t2 = toTimestamp('2024-01-02T00:00:00.000Z')
    expect(t2 - t1).toBe(86400000)
  })
})
