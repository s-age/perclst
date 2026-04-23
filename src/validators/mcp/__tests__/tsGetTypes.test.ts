import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { tsGetTypesParams } from '../tsGetTypes'

// eslint-disable-next-line local/no-any
function getDescription(schema: any): string | undefined {
  return schema.description
}

describe('tsGetTypesParams schema', () => {
  it('exports an object with all required fields', () => {
    expect(tsGetTypesParams).toBeDefined()
    expect(tsGetTypesParams).toHaveProperty('file_path')
    expect(tsGetTypesParams).toHaveProperty('symbol_name')
  })

  describe('file_path field', () => {
    it('is a Zod string schema', () => {
      expect(tsGetTypesParams.file_path).toBeInstanceOf(z.ZodType)
    })

    it('is required', () => {
      const schema = z.object({ file_path: tsGetTypesParams.file_path })
      expect(schema.safeParse({}).success).toBe(false)
    })

    it('accepts string values', () => {
      const schema = z.object({ file_path: tsGetTypesParams.file_path })
      const result = schema.safeParse({ file_path: 'src/example.ts' })
      expect(result.success).toBe(true)
      expect(result.data?.file_path).toBe('src/example.ts')
    })

    it('has a description', () => {
      const description = getDescription(tsGetTypesParams.file_path)
      expect(description).toBe('Path to the TypeScript file')
    })

    it('rejects arrays', () => {
      const schema = z.object({ file_path: tsGetTypesParams.file_path })
      const result = schema.safeParse({ file_path: ['src/example.ts'] })
      expect(result.success).toBe(false)
    })

    it('rejects objects', () => {
      const schema = z.object({ file_path: tsGetTypesParams.file_path })
      const result = schema.safeParse({ file_path: { path: 'example.ts' } })
      expect(result.success).toBe(false)
    })

    it('rejects booleans', () => {
      const schema = z.object({ file_path: tsGetTypesParams.file_path })
      const result = schema.safeParse({ file_path: true })
      expect(result.success).toBe(false)
    })

    it('rejects null', () => {
      const schema = z.object({ file_path: tsGetTypesParams.file_path })
      const result = schema.safeParse({ file_path: null })
      expect(result.success).toBe(false)
    })

    it('accepts empty string', () => {
      const schema = z.object({ file_path: tsGetTypesParams.file_path })
      const result = schema.safeParse({ file_path: '' })
      expect(result.success).toBe(true)
    })

    it('accepts absolute paths', () => {
      const schema = z.object({ file_path: tsGetTypesParams.file_path })
      const result = schema.safeParse({ file_path: '/Users/home/project/src/file.ts' })
      expect(result.success).toBe(true)
    })
  })

  describe('symbol_name field', () => {
    it('is a Zod string schema', () => {
      expect(tsGetTypesParams.symbol_name).toBeInstanceOf(z.ZodType)
    })

    it('is required', () => {
      const schema = z.object({ symbol_name: tsGetTypesParams.symbol_name })
      expect(schema.safeParse({}).success).toBe(false)
    })

    it('accepts string values', () => {
      const schema = z.object({ symbol_name: tsGetTypesParams.symbol_name })
      const result = schema.safeParse({ symbol_name: 'myFunction' })
      expect(result.success).toBe(true)
      expect(result.data?.symbol_name).toBe('myFunction')
    })

    it('has a description', () => {
      const description = getDescription(tsGetTypesParams.symbol_name)
      expect(description).toBe('Name of the symbol to get type information for')
    })

    it('rejects arrays', () => {
      const schema = z.object({ symbol_name: tsGetTypesParams.symbol_name })
      const result = schema.safeParse({ symbol_name: ['myFunction'] })
      expect(result.success).toBe(false)
    })

    it('rejects objects', () => {
      const schema = z.object({ symbol_name: tsGetTypesParams.symbol_name })
      const result = schema.safeParse({ symbol_name: { name: 'myFunction' } })
      expect(result.success).toBe(false)
    })

    it('rejects booleans', () => {
      const schema = z.object({ symbol_name: tsGetTypesParams.symbol_name })
      const result = schema.safeParse({ symbol_name: false })
      expect(result.success).toBe(false)
    })

    it('rejects null', () => {
      const schema = z.object({ symbol_name: tsGetTypesParams.symbol_name })
      const result = schema.safeParse({ symbol_name: null })
      expect(result.success).toBe(false)
    })

    it('accepts empty string', () => {
      const schema = z.object({ symbol_name: tsGetTypesParams.symbol_name })
      const result = schema.safeParse({ symbol_name: '' })
      expect(result.success).toBe(true)
    })
  })

  describe('complete schema composition', () => {
    it('validates with all required fields', () => {
      const schema = z.object(tsGetTypesParams)
      const result = schema.safeParse({ file_path: 'src/example.ts', symbol_name: 'myFunction' })
      expect(result.success).toBe(true)
    })

    it('rejects when file_path is missing', () => {
      const schema = z.object(tsGetTypesParams)
      const result = schema.safeParse({ symbol_name: 'myFunction' })
      expect(result.success).toBe(false)
    })

    it('rejects when symbol_name is missing', () => {
      const schema = z.object(tsGetTypesParams)
      const result = schema.safeParse({ file_path: 'src/example.ts' })
      expect(result.success).toBe(false)
    })

    it('rejects when both required fields are missing', () => {
      const schema = z.object(tsGetTypesParams)
      const result = schema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('strips unknown fields by default', () => {
      const schema = z.object(tsGetTypesParams)
      const result = schema.safeParse({
        file_path: 'src/example.ts',
        symbol_name: 'myFunction',
        unknown_field: 'stripped'
      })
      expect(result.success).toBe(true)
      // eslint-disable-next-line local/no-any
      expect((result.data as any).unknown_field).toBeUndefined()
    })

    it('rejects unknown fields when using strict()', () => {
      const schema = z.object(tsGetTypesParams).strict()
      const result = schema.safeParse({
        file_path: 'src/example.ts',
        symbol_name: 'myFunction',
        unknown_field: 'fail'
      })
      expect(result.success).toBe(false)
    })
  })
})
