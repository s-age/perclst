import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { tsCallGraphParams } from '../tsCallGraph'

// eslint-disable-next-line local/no-any
function getDescription(schema: any): string | undefined {
  return schema.description
}

describe('tsCallGraphParams schema', () => {
  it('exports an object with all fields', () => {
    expect(tsCallGraphParams).toBeDefined()
    expect(tsCallGraphParams).toHaveProperty('file_path')
    expect(tsCallGraphParams).toHaveProperty('entry')
    expect(tsCallGraphParams).toHaveProperty('max_depth')
  })

  describe('file_path field', () => {
    it('is a Zod string schema', () => {
      expect(tsCallGraphParams.file_path).toBeInstanceOf(z.ZodType)
    })

    it('is required', () => {
      const schema = z.object({ file_path: tsCallGraphParams.file_path })
      expect(schema.safeParse({}).success).toBe(false)
    })

    it('accepts string values', () => {
      const schema = z.object({ file_path: tsCallGraphParams.file_path })
      const result = schema.safeParse({ file_path: 'src/example.ts' })
      expect(result.success).toBe(true)
      expect(result.data?.file_path).toBe('src/example.ts')
    })

    it('has a description', () => {
      const description = getDescription(tsCallGraphParams.file_path)
      expect(description).toBe('Path to the TypeScript file to trace')
    })

    it('rejects arrays', () => {
      const schema = z.object({ file_path: tsCallGraphParams.file_path })
      const result = schema.safeParse({ file_path: ['src/example.ts'] })
      expect(result.success).toBe(false)
    })

    it('rejects objects', () => {
      const schema = z.object({ file_path: tsCallGraphParams.file_path })
      const result = schema.safeParse({ file_path: { path: 'example.ts' } })
      expect(result.success).toBe(false)
    })

    it('rejects booleans', () => {
      const schema = z.object({ file_path: tsCallGraphParams.file_path })
      const result = schema.safeParse({ file_path: true })
      expect(result.success).toBe(false)
    })

    it('rejects null', () => {
      const schema = z.object({ file_path: tsCallGraphParams.file_path })
      const result = schema.safeParse({ file_path: null })
      expect(result.success).toBe(false)
    })

    it('accepts empty string', () => {
      const schema = z.object({ file_path: tsCallGraphParams.file_path })
      const result = schema.safeParse({ file_path: '' })
      expect(result.success).toBe(true)
      expect(result.data?.file_path).toBe('')
    })

    it('accepts paths with special characters', () => {
      const schema = z.object({ file_path: tsCallGraphParams.file_path })
      const result = schema.safeParse({ file_path: '/path/with-special_chars@123/file.ts' })
      expect(result.success).toBe(true)
    })

    it('accepts absolute paths', () => {
      const schema = z.object({ file_path: tsCallGraphParams.file_path })
      const result = schema.safeParse({ file_path: '/Users/home/project/src/file.ts' })
      expect(result.success).toBe(true)
    })

    it('accepts relative paths', () => {
      const schema = z.object({ file_path: tsCallGraphParams.file_path })
      const result = schema.safeParse({ file_path: '../src/file.ts' })
      expect(result.success).toBe(true)
    })
  })

  describe('entry field', () => {
    it('is a Zod string schema', () => {
      expect(tsCallGraphParams.entry).toBeInstanceOf(z.ZodType)
    })

    it('is optional', () => {
      const schema = z.object({ entry: tsCallGraphParams.entry })
      expect(schema.safeParse({}).success).toBe(true)
    })

    it('accepts string values', () => {
      const schema = z.object({ entry: tsCallGraphParams.entry })
      const result = schema.safeParse({ entry: 'myFunction' })
      expect(result.success).toBe(true)
      expect(result.data?.entry).toBe('myFunction')
    })

    it('has a description', () => {
      const description = getDescription(tsCallGraphParams.entry)
      expect(description).toBe(
        'Entry point symbol to trace. Use "functionName" for functions, "ClassName.methodName" for methods. Omit to trace all exported functions.'
      )
    })

    it('accepts method notation', () => {
      const schema = z.object({ entry: tsCallGraphParams.entry })
      const result = schema.safeParse({ entry: 'ClassName.methodName' })
      expect(result.success).toBe(true)
      expect(result.data?.entry).toBe('ClassName.methodName')
    })

    it('accepts empty string', () => {
      const schema = z.object({ entry: tsCallGraphParams.entry })
      const result = schema.safeParse({ entry: '' })
      expect(result.success).toBe(true)
      expect(result.data?.entry).toBe('')
    })

    it('rejects arrays', () => {
      const schema = z.object({ entry: tsCallGraphParams.entry })
      const result = schema.safeParse({ entry: ['myFunction'] })
      expect(result.success).toBe(false)
    })

    it('rejects objects', () => {
      const schema = z.object({ entry: tsCallGraphParams.entry })
      const result = schema.safeParse({ entry: { name: 'myFunction' } })
      expect(result.success).toBe(false)
    })

    it('rejects booleans', () => {
      const schema = z.object({ entry: tsCallGraphParams.entry })
      const result = schema.safeParse({ entry: true })
      expect(result.success).toBe(false)
    })

    it('rejects null', () => {
      const schema = z.object({ entry: tsCallGraphParams.entry })
      const result = schema.safeParse({ entry: null })
      expect(result.success).toBe(false)
    })

    it('rejects numbers', () => {
      const schema = z.object({ entry: tsCallGraphParams.entry })
      const result = schema.safeParse({ entry: 42 })
      expect(result.success).toBe(false)
    })
  })

  describe('max_depth field', () => {
    it('is a Zod number schema', () => {
      expect(tsCallGraphParams.max_depth).toBeInstanceOf(z.ZodType)
    })

    it('is optional', () => {
      const schema = z.object({ max_depth: tsCallGraphParams.max_depth })
      expect(schema.safeParse({}).success).toBe(true)
    })

    it('has a description', () => {
      const description = getDescription(tsCallGraphParams.max_depth)
      expect(description).toBe('Maximum recursion depth (default: 5)')
    })

    it('accepts minimum value 1', () => {
      const schema = z.object({ max_depth: tsCallGraphParams.max_depth })
      const result = schema.safeParse({ max_depth: 1 })
      expect(result.success).toBe(true)
      expect(result.data?.max_depth).toBe(1)
    })

    it('accepts maximum value 10', () => {
      const schema = z.object({ max_depth: tsCallGraphParams.max_depth })
      const result = schema.safeParse({ max_depth: 10 })
      expect(result.success).toBe(true)
      expect(result.data?.max_depth).toBe(10)
    })

    it('accepts value in middle of range', () => {
      const schema = z.object({ max_depth: tsCallGraphParams.max_depth })
      const result = schema.safeParse({ max_depth: 5 })
      expect(result.success).toBe(true)
      expect(result.data?.max_depth).toBe(5)
    })

    it('rejects value below minimum (0)', () => {
      const schema = z.object({ max_depth: tsCallGraphParams.max_depth })
      const result = schema.safeParse({ max_depth: 0 })
      expect(result.success).toBe(false)
    })

    it('rejects negative values', () => {
      const schema = z.object({ max_depth: tsCallGraphParams.max_depth })
      const result = schema.safeParse({ max_depth: -1 })
      expect(result.success).toBe(false)
    })

    it('rejects value above maximum (11)', () => {
      const schema = z.object({ max_depth: tsCallGraphParams.max_depth })
      const result = schema.safeParse({ max_depth: 11 })
      expect(result.success).toBe(false)
    })

    it('rejects non-integer values', () => {
      const schema = z.object({ max_depth: tsCallGraphParams.max_depth })
      const result = schema.safeParse({ max_depth: 3.5 })
      expect(result.success).toBe(false)
    })

    it('rejects strings', () => {
      const schema = z.object({ max_depth: tsCallGraphParams.max_depth })
      const result = schema.safeParse({ max_depth: '5' })
      expect(result.success).toBe(false)
    })

    it('rejects booleans', () => {
      const schema = z.object({ max_depth: tsCallGraphParams.max_depth })
      const result = schema.safeParse({ max_depth: true })
      expect(result.success).toBe(false)
    })

    it('rejects arrays', () => {
      const schema = z.object({ max_depth: tsCallGraphParams.max_depth })
      const result = schema.safeParse({ max_depth: [5] })
      expect(result.success).toBe(false)
    })

    it('rejects objects', () => {
      const schema = z.object({ max_depth: tsCallGraphParams.max_depth })
      const result = schema.safeParse({ max_depth: { value: 5 } })
      expect(result.success).toBe(false)
    })

    it('rejects null', () => {
      const schema = z.object({ max_depth: tsCallGraphParams.max_depth })
      const result = schema.safeParse({ max_depth: null })
      expect(result.success).toBe(false)
    })
  })

  describe('complete schema composition', () => {
    it('validates with required field only', () => {
      const schema = z.object(tsCallGraphParams)
      const result = schema.safeParse({ file_path: 'src/example.ts' })
      expect(result.success).toBe(true)
    })

    it('validates with all fields provided', () => {
      const schema = z.object(tsCallGraphParams)
      const result = schema.safeParse({
        file_path: 'src/example.ts',
        entry: 'myFunction',
        max_depth: 3
      })
      expect(result.success).toBe(true)
    })

    it('validates with required field and entry only', () => {
      const schema = z.object(tsCallGraphParams)
      const result = schema.safeParse({
        file_path: 'src/example.ts',
        entry: 'ClassName.methodName'
      })
      expect(result.success).toBe(true)
    })

    it('validates with required field and max_depth only', () => {
      const schema = z.object(tsCallGraphParams)
      const result = schema.safeParse({
        file_path: 'src/example.ts',
        max_depth: 7
      })
      expect(result.success).toBe(true)
    })

    it('rejects when file_path is missing', () => {
      const schema = z.object(tsCallGraphParams)
      const result = schema.safeParse({
        entry: 'myFunction',
        max_depth: 5
      })
      expect(result.success).toBe(false)
    })

    it('rejects when file_path is missing even with optional fields', () => {
      const schema = z.object(tsCallGraphParams)
      const result = schema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('rejects non-string file_path with other valid fields', () => {
      const schema = z.object(tsCallGraphParams)
      const result = schema.safeParse({
        file_path: 123,
        entry: 'myFunction',
        max_depth: 5
      })
      expect(result.success).toBe(false)
    })

    it('rejects non-string entry with other valid fields', () => {
      const schema = z.object(tsCallGraphParams)
      const result = schema.safeParse({
        file_path: 'src/example.ts',
        entry: 42
      })
      expect(result.success).toBe(false)
    })

    it('rejects out-of-range max_depth with other valid fields', () => {
      const schema = z.object(tsCallGraphParams)
      const result = schema.safeParse({
        file_path: 'src/example.ts',
        entry: 'myFunction',
        max_depth: 15
      })
      expect(result.success).toBe(false)
    })

    it('rejects non-integer max_depth with other valid fields', () => {
      const schema = z.object(tsCallGraphParams)
      const result = schema.safeParse({
        file_path: 'src/example.ts',
        max_depth: 2.5
      })
      expect(result.success).toBe(false)
    })

    it('strips unknown fields by default', () => {
      const schema = z.object(tsCallGraphParams)
      const result = schema.safeParse({
        file_path: 'src/example.ts',
        unknown_field: 'will be stripped'
      })
      expect(result.success).toBe(true)
      // eslint-disable-next-line local/no-any
      expect((result.data as any).unknown_field).toBeUndefined()
    })

    it('rejects unknown fields when using strict()', () => {
      const schema = z.object(tsCallGraphParams).strict()
      const result = schema.safeParse({
        file_path: 'src/example.ts',
        unknown_field: 'will fail in strict mode'
      })
      expect(result.success).toBe(false)
    })

    it('preserves extra fields when using passthrough', () => {
      const schema = z.object(tsCallGraphParams).passthrough()
      const result = schema.safeParse({
        file_path: 'src/example.ts',
        unknown_field: 'preserved with passthrough'
      })
      expect(result.success).toBe(true)
      // eslint-disable-next-line local/no-any
      expect((result.data as any).unknown_field).toBe('preserved with passthrough')
    })
  })
})
