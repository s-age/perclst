import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { schema, safeParse } from '../schema'
import { ValidationError } from '@src/errors/validationError'

describe('schema', () => {
  it('should create a Zod object schema from a shape', () => {
    const s = schema({ name: z.string() })
    expect(s.parse({ name: 'hello' })).toEqual({ name: 'hello' })
  })
})

describe('safeParse', () => {
  const s = z.object({ value: z.string().min(1) })

  it('should return parsed value on success', () => {
    expect(safeParse(s, { value: 'ok' })).toEqual({ value: 'ok' })
  })

  it('should throw ValidationError on ZodError', () => {
    expect(() => safeParse(s, { value: '' })).toThrow(ValidationError)
  })

  it('should include field path in ValidationError message', () => {
    expect(() => safeParse(s, { value: '' })).toThrow('value:')
  })

  it('should rethrow non-Zod errors as-is', () => {
    const throwing = {
      parse() {
        throw new TypeError('unexpected')
      }
    } as unknown as z.ZodType<unknown>
    expect(() => safeParse(throwing, {})).toThrow(TypeError)
  })
})
