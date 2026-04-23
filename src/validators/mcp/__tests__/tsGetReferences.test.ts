import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { tsGetReferencesParams } from '../tsGetReferences'

// Helper to safely extract Zod description
// eslint-disable-next-line local/no-any
function getDescription(schema: any): string | undefined {
  return schema.description
}

describe('tsGetReferencesParams schema', () => {
  it('exports an object with all required fields', () => {
    expect(tsGetReferencesParams).toBeDefined()
    expect(tsGetReferencesParams).toHaveProperty('file_path')
    expect(tsGetReferencesParams).toHaveProperty('symbol_name')
    expect(tsGetReferencesParams).toHaveProperty('include_test')
    expect(tsGetReferencesParams).toHaveProperty('recursive')
  })

  describe('file_path field', () => {
    it('is a Zod string schema', () => {
      expect(tsGetReferencesParams.file_path).toBeInstanceOf(z.ZodType)
    })

    it('is required', () => {
      const schema = z.object({ file_path: tsGetReferencesParams.file_path })
      expect(schema.safeParse({}).success).toBe(false)
    })

    it('accepts string values', () => {
      const schema = z.object({ file_path: tsGetReferencesParams.file_path })
      const result = schema.safeParse({ file_path: 'src/example.ts' })
      expect(result.success).toBe(true)
      expect(result.data?.file_path).toBe('src/example.ts')
    })

    it('has a description', () => {
      const description = getDescription(tsGetReferencesParams.file_path)
      expect(description).toBe('Path to the TypeScript file')
    })

    it('rejects arrays', () => {
      const schema = z.object({ file_path: tsGetReferencesParams.file_path })
      const result = schema.safeParse({ file_path: ['src/example.ts'] })
      expect(result.success).toBe(false)
    })

    it('rejects objects', () => {
      const schema = z.object({ file_path: tsGetReferencesParams.file_path })
      const result = schema.safeParse({ file_path: { path: 'example.ts' } })
      expect(result.success).toBe(false)
    })

    it('rejects booleans', () => {
      const schema = z.object({ file_path: tsGetReferencesParams.file_path })
      const result = schema.safeParse({ file_path: true })
      expect(result.success).toBe(false)
    })

    it('rejects null', () => {
      const schema = z.object({ file_path: tsGetReferencesParams.file_path })
      const result = schema.safeParse({ file_path: null })
      expect(result.success).toBe(false)
    })

    it('accepts empty string', () => {
      const schema = z.object({ file_path: tsGetReferencesParams.file_path })
      const result = schema.safeParse({ file_path: '' })
      expect(result.success).toBe(true)
      expect(result.data?.file_path).toBe('')
    })

    it('accepts paths with special characters', () => {
      const schema = z.object({ file_path: tsGetReferencesParams.file_path })
      const result = schema.safeParse({ file_path: '/path/with-special_chars@123/file.ts' })
      expect(result.success).toBe(true)
    })

    it('accepts absolute paths', () => {
      const schema = z.object({ file_path: tsGetReferencesParams.file_path })
      const result = schema.safeParse({ file_path: '/Users/home/project/src/file.ts' })
      expect(result.success).toBe(true)
    })

    it('accepts relative paths', () => {
      const schema = z.object({ file_path: tsGetReferencesParams.file_path })
      const result = schema.safeParse({ file_path: '../src/file.ts' })
      expect(result.success).toBe(true)
    })
  })

  describe('symbol_name field', () => {
    it('is a Zod string schema', () => {
      expect(tsGetReferencesParams.symbol_name).toBeInstanceOf(z.ZodType)
    })

    it('is required', () => {
      const schema = z.object({ symbol_name: tsGetReferencesParams.symbol_name })
      expect(schema.safeParse({}).success).toBe(false)
    })

    it('accepts string values', () => {
      const schema = z.object({ symbol_name: tsGetReferencesParams.symbol_name })
      const result = schema.safeParse({ symbol_name: 'myFunction' })
      expect(result.success).toBe(true)
      expect(result.data?.symbol_name).toBe('myFunction')
    })

    it('has a description', () => {
      const description = getDescription(tsGetReferencesParams.symbol_name)
      expect(description).toBe('Name of the symbol to find references for')
    })

    it('rejects arrays', () => {
      const schema = z.object({ symbol_name: tsGetReferencesParams.symbol_name })
      const result = schema.safeParse({ symbol_name: ['myFunction'] })
      expect(result.success).toBe(false)
    })

    it('rejects objects', () => {
      const schema = z.object({ symbol_name: tsGetReferencesParams.symbol_name })
      const result = schema.safeParse({ symbol_name: { name: 'myFunction' } })
      expect(result.success).toBe(false)
    })

    it('rejects booleans', () => {
      const schema = z.object({ symbol_name: tsGetReferencesParams.symbol_name })
      const result = schema.safeParse({ symbol_name: false })
      expect(result.success).toBe(false)
    })

    it('rejects null', () => {
      const schema = z.object({ symbol_name: tsGetReferencesParams.symbol_name })
      const result = schema.safeParse({ symbol_name: null })
      expect(result.success).toBe(false)
    })

    it('accepts empty string', () => {
      const schema = z.object({ symbol_name: tsGetReferencesParams.symbol_name })
      const result = schema.safeParse({ symbol_name: '' })
      expect(result.success).toBe(true)
    })

    it('accepts names with special characters', () => {
      const schema = z.object({ symbol_name: tsGetReferencesParams.symbol_name })
      const result = schema.safeParse({ symbol_name: '_private$Symbol_123' })
      expect(result.success).toBe(true)
    })

    it('accepts TypeScript generic syntax', () => {
      const schema = z.object({ symbol_name: tsGetReferencesParams.symbol_name })
      const result = schema.safeParse({ symbol_name: 'MyClass<T>' })
      expect(result.success).toBe(true)
    })
  })

  describe('include_test field', () => {
    it('is a Zod boolean schema', () => {
      expect(tsGetReferencesParams.include_test).toBeInstanceOf(z.ZodType)
    })

    it('is optional', () => {
      const schema = z.object({ include_test: tsGetReferencesParams.include_test })
      expect(schema.safeParse({}).success).toBe(true)
    })

    it('accepts boolean true', () => {
      const schema = z.object({ include_test: tsGetReferencesParams.include_test })
      const result = schema.safeParse({ include_test: true })
      expect(result.success).toBe(true)
      expect(result.data?.include_test).toBe(true)
    })

    it('accepts boolean false', () => {
      const schema = z.object({ include_test: tsGetReferencesParams.include_test })
      const result = schema.safeParse({ include_test: false })
      expect(result.success).toBe(true)
      expect(result.data?.include_test).toBe(false)
    })

    it('has a description', () => {
      const description = getDescription(tsGetReferencesParams.include_test)
      expect(description).toBe('Include references from __tests__ directories (default: false)')
    })

    it('rejects strings', () => {
      const schema = z.object({ include_test: tsGetReferencesParams.include_test })
      const result = schema.safeParse({ include_test: 'true' })
      expect(result.success).toBe(false)
    })

    it('rejects numbers', () => {
      const schema = z.object({ include_test: tsGetReferencesParams.include_test })
      const result = schema.safeParse({ include_test: 1 })
      expect(result.success).toBe(false)
    })

    it('rejects arrays', () => {
      const schema = z.object({ include_test: tsGetReferencesParams.include_test })
      const result = schema.safeParse({ include_test: [true] })
      expect(result.success).toBe(false)
    })

    it('rejects objects', () => {
      const schema = z.object({ include_test: tsGetReferencesParams.include_test })
      const result = schema.safeParse({ include_test: { value: true } })
      expect(result.success).toBe(false)
    })

    it('rejects null', () => {
      const schema = z.object({ include_test: tsGetReferencesParams.include_test })
      const result = schema.safeParse({ include_test: null })
      expect(result.success).toBe(false)
    })
  })

  describe('recursive field', () => {
    it('is a Zod boolean schema', () => {
      expect(tsGetReferencesParams.recursive).toBeInstanceOf(z.ZodType)
    })

    it('is optional', () => {
      const schema = z.object({ recursive: tsGetReferencesParams.recursive })
      expect(schema.safeParse({}).success).toBe(true)
    })

    it('accepts boolean true', () => {
      const schema = z.object({ recursive: tsGetReferencesParams.recursive })
      const result = schema.safeParse({ recursive: true })
      expect(result.success).toBe(true)
      expect(result.data?.recursive).toBe(true)
    })

    it('accepts boolean false', () => {
      const schema = z.object({ recursive: tsGetReferencesParams.recursive })
      const result = schema.safeParse({ recursive: false })
      expect(result.success).toBe(true)
      expect(result.data?.recursive).toBe(false)
    })

    it('has a description', () => {
      const description = getDescription(tsGetReferencesParams.recursive)
      expect(description).toBe(
        'Recursively follow callers up the call chain until no more references are found (default: true). Set to false for direct references only.'
      )
    })

    it('rejects strings', () => {
      const schema = z.object({ recursive: tsGetReferencesParams.recursive })
      const result = schema.safeParse({ recursive: 'true' })
      expect(result.success).toBe(false)
    })

    it('rejects numbers', () => {
      const schema = z.object({ recursive: tsGetReferencesParams.recursive })
      const result = schema.safeParse({ recursive: 0 })
      expect(result.success).toBe(false)
    })

    it('rejects arrays', () => {
      const schema = z.object({ recursive: tsGetReferencesParams.recursive })
      const result = schema.safeParse({ recursive: [false] })
      expect(result.success).toBe(false)
    })

    it('rejects objects', () => {
      const schema = z.object({ recursive: tsGetReferencesParams.recursive })
      const result = schema.safeParse({ recursive: { value: false } })
      expect(result.success).toBe(false)
    })

    it('rejects null', () => {
      const schema = z.object({ recursive: tsGetReferencesParams.recursive })
      const result = schema.safeParse({ recursive: null })
      expect(result.success).toBe(false)
    })
  })

  describe('complete schema composition', () => {
    it('validates with all required fields only', () => {
      const schema = z.object(tsGetReferencesParams)
      const result = schema.safeParse({
        file_path: 'src/example.ts',
        symbol_name: 'myFunction'
      })
      expect(result.success).toBe(true)
    })

    it('validates with all fields provided', () => {
      const schema = z.object(tsGetReferencesParams)
      const result = schema.safeParse({
        file_path: 'src/example.ts',
        symbol_name: 'myFunction',
        include_test: true,
        recursive: false
      })
      expect(result.success).toBe(true)
    })

    it('validates with required fields and one optional field', () => {
      const schema = z.object(tsGetReferencesParams)
      const result = schema.safeParse({
        file_path: 'src/example.ts',
        symbol_name: 'myFunction',
        include_test: true
      })
      expect(result.success).toBe(true)
    })

    it('validates with required fields and other optional field', () => {
      const schema = z.object(tsGetReferencesParams)
      const result = schema.safeParse({
        file_path: 'src/example.ts',
        symbol_name: 'myFunction',
        recursive: false
      })
      expect(result.success).toBe(true)
    })

    it('rejects when file_path is missing', () => {
      const schema = z.object(tsGetReferencesParams)
      const result = schema.safeParse({
        symbol_name: 'myFunction'
      })
      expect(result.success).toBe(false)
    })

    it('rejects when symbol_name is missing', () => {
      const schema = z.object(tsGetReferencesParams)
      const result = schema.safeParse({
        file_path: 'src/example.ts'
      })
      expect(result.success).toBe(false)
    })

    it('rejects when both required fields are missing', () => {
      const schema = z.object(tsGetReferencesParams)
      const result = schema.safeParse({
        include_test: true,
        recursive: false
      })
      expect(result.success).toBe(false)
    })

    it('rejects non-string file_path with other valid fields', () => {
      const schema = z.object(tsGetReferencesParams)
      const result = schema.safeParse({
        file_path: 123,
        symbol_name: 'myFunction'
      })
      expect(result.success).toBe(false)
    })

    it('rejects non-string symbol_name with other valid fields', () => {
      const schema = z.object(tsGetReferencesParams)
      const result = schema.safeParse({
        file_path: 'src/example.ts',
        symbol_name: { name: 'myFunction' }
      })
      expect(result.success).toBe(false)
    })

    it('rejects non-boolean include_test', () => {
      const schema = z.object(tsGetReferencesParams)
      const result = schema.safeParse({
        file_path: 'src/example.ts',
        symbol_name: 'myFunction',
        include_test: 'true'
      })
      expect(result.success).toBe(false)
    })

    it('rejects non-boolean recursive', () => {
      const schema = z.object(tsGetReferencesParams)
      const result = schema.safeParse({
        file_path: 'src/example.ts',
        symbol_name: 'myFunction',
        recursive: 1
      })
      expect(result.success).toBe(false)
    })

    it('strips unknown fields by default', () => {
      const schema = z.object(tsGetReferencesParams)
      const result = schema.safeParse({
        file_path: 'src/example.ts',
        symbol_name: 'myFunction',
        unknown_field: 'will be stripped'
      })
      expect(result.success).toBe(true)
      // eslint-disable-next-line local/no-any
      expect((result.data as any).unknown_field).toBeUndefined()
    })

    it('rejects unknown fields when using strict()', () => {
      const schema = z.object(tsGetReferencesParams).strict()
      const result = schema.safeParse({
        file_path: 'src/example.ts',
        symbol_name: 'myFunction',
        unknown_field: 'will fail in strict mode'
      })
      expect(result.success).toBe(false)
    })

    it('preserves extra fields when using passthrough', () => {
      const schema = z.object(tsGetReferencesParams).passthrough()
      const result = schema.safeParse({
        file_path: 'src/example.ts',
        symbol_name: 'myFunction',
        unknown_field: 'preserved with passthrough'
      })
      expect(result.success).toBe(true)
      // eslint-disable-next-line local/no-any
      expect((result.data as any).unknown_field).toBe('preserved with passthrough')
    })
  })
})
