import { describe, it, expect } from 'vitest'
import { parseSweepSession } from '../sweepSession'
import { ValidationError } from '@src/errors/validationError'

describe('parseSweepSession', () => {
  // ── happy paths ─────────────────────────────────────────────────────────────

  it('should parse from + to with no extra flags', () => {
    const result = parseSweepSession({ from: '2024-01-01', to: '2024-12-31' })
    expect(result.from).toBe('2024-01-01')
    expect(result.to).toBe('2024-12-31')
  })

  it('should parse to-only (upper-bound filter without from)', () => {
    const result = parseSweepSession({ to: '2024-12-31' })
    expect(result.to).toBe('2024-12-31')
    expect(result.from).toBeUndefined()
  })

  it('should parse from-only when force is true', () => {
    const result = parseSweepSession({ from: '2024-01-01', force: true })
    expect(result.from).toBe('2024-01-01')
    expect(result.force).toBe(true)
    expect(result.to).toBeUndefined()
  })

  it('should parse from-only when dryRun is true', () => {
    const result = parseSweepSession({ from: '2024-01-01', dryRun: true })
    expect(result.from).toBe('2024-01-01')
    expect(result.dryRun).toBe(true)
  })

  it('should parse status-only with to present', () => {
    const result = parseSweepSession({ status: 'completed', to: '2024-12-31' })
    expect(result.status).toBe('completed')
    expect(result.to).toBe('2024-12-31')
  })

  it('should parse like-only with to present', () => {
    const result = parseSweepSession({ like: 'deploy*', to: '2024-12-31' })
    expect(result.like).toBe('deploy*')
  })

  it('should parse anonOnly-only with to present', () => {
    const result = parseSweepSession({ anonOnly: true, to: '2024-12-31' })
    expect(result.anonOnly).toBe(true)
  })

  it('should parse all fields together (no anonOnly+like conflict)', () => {
    const result = parseSweepSession({
      from: '2024-01-01',
      to: '2024-12-31',
      status: 'active',
      dryRun: false,
      force: false
    })
    expect(result.from).toBe('2024-01-01')
    expect(result.to).toBe('2024-12-31')
    expect(result.status).toBe('active')
    expect(result.dryRun).toBe(false)
    expect(result.force).toBe(false)
  })

  it('should leave undefined for omitted optional fields', () => {
    const result = parseSweepSession({ status: 'active', to: '2024-06-01' })
    expect(result.from).toBeUndefined()
    expect(result.like).toBeUndefined()
    expect(result.anonOnly).toBeUndefined()
    expect(result.dryRun).toBeUndefined()
    expect(result.force).toBeUndefined()
  })

  // ── superRefine: at-least-one-filter rule ───────────────────────────────────

  it('should throw ValidationError when no filter option is provided', () => {
    expect(() => parseSweepSession({})).toThrow(ValidationError)
  })

  it('should throw ValidationError when only dryRun is provided (no filter)', () => {
    expect(() => parseSweepSession({ dryRun: true })).toThrow(ValidationError)
  })

  it('should throw ValidationError when only force is provided (no filter)', () => {
    expect(() => parseSweepSession({ force: true })).toThrow(ValidationError)
  })

  // ── superRefine: anonOnly + like conflict ───────────────────────────────────

  it('should throw ValidationError when anonOnly and like are both set', () => {
    expect(() => parseSweepSession({ anonOnly: true, like: 'foo*', to: '2024-12-31' })).toThrow(
      ValidationError
    )
  })

  // ── superRefine: open-ended range guard (no to, no dryRun, no force) ────────

  it('should throw ValidationError when to is omitted without force or dryRun', () => {
    expect(() => parseSweepSession({ from: '2024-01-01' })).toThrow(ValidationError)
  })

  it('should throw ValidationError when status-only without to, force, or dryRun', () => {
    expect(() => parseSweepSession({ status: 'active' })).toThrow(ValidationError)
  })

  it('should throw ValidationError when like-only without to, force, or dryRun', () => {
    expect(() => parseSweepSession({ like: 'foo*' })).toThrow(ValidationError)
  })

  it('should throw ValidationError when anonOnly-only without to, force, or dryRun', () => {
    expect(() => parseSweepSession({ anonOnly: true })).toThrow(ValidationError)
  })

  // ── date format regex ────────────────────────────────────────────────────────

  it('should throw ValidationError when from does not match YYYY-MM-DD', () => {
    expect(() => parseSweepSession({ from: '01-01-2024', to: '2024-12-31' })).toThrow(
      ValidationError
    )
  })

  it('should throw ValidationError when to does not match YYYY-MM-DD', () => {
    expect(() => parseSweepSession({ from: '2024-01-01', to: '2024/12/31' })).toThrow(
      ValidationError
    )
  })

  it('should throw ValidationError when from is a plain year (not full date)', () => {
    expect(() => parseSweepSession({ from: '2024', to: '2024-12-31' })).toThrow(ValidationError)
  })

  // ── type coercion / wrong types ──────────────────────────────────────────────

  it('should throw ValidationError when anonOnly is a string instead of boolean', () => {
    expect(() => parseSweepSession({ anonOnly: 'yes', to: '2024-12-31' })).toThrow(ValidationError)
  })

  it('should throw ValidationError when raw input is null', () => {
    expect(() => parseSweepSession(null)).toThrow(ValidationError)
  })

  it('should throw ValidationError when raw input is a string', () => {
    expect(() => parseSweepSession('2024-01-01')).toThrow(ValidationError)
  })
})
