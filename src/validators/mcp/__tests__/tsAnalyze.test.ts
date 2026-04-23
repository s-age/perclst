import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { tsAnalyzeParams } from '../tsAnalyze'

// eslint-disable-next-line local/no-any
function getDescription(schema: any): string | undefined {
  return schema.description
}

describe('tsAnalyzeParams schema', () => {
  it('exports an object with all required fields', () => {
    expect(tsAnalyzeParams).toBeDefined()
    expect(tsAnalyzeParams).toHaveProperty('file_path')
  })

  describe('file_path field', () => {
    it('is a Zod string schema', () => {
      expect(tsAnalyzeParams.file_path).toBeInstanceOf(z.ZodType)
    })

    it('is required', () => {
      const schema = z.object({ file_path: tsAnalyzeParams.file_path })
      expect(schema.safeParse({}).success).toBe(false)
    })

    it('accepts string values', () => {
      const schema = z.object({ file_path: tsAnalyzeParams.file_path })
      const result = schema.safeParse({ file_path: 'src/example.ts' })
      expect(result.success).toBe(true)
      expect(result.data?.file_path).toBe('src/example.ts')
    })

    it('has a description', () => {
      const description = getDescription(tsAnalyzeParams.file_path)
      expect(description).toBe('Path to the TypeScript file to analyze')
    })

    it('rejects arrays', () => {
      const schema = z.object({ file_path: tsAnalyzeParams.file_path })
      const result = schema.safeParse({ file_path: ['src/example.ts'] })
      expect(result.success).toBe(false)
    })

    it('rejects objects', () => {
      const schema = z.object({ file_path: tsAnalyzeParams.file_path })
      const result = schema.safeParse({ file_path: { path: 'example.ts' } })
      expect(result.success).toBe(false)
    })

    it('rejects booleans', () => {
      const schema = z.object({ file_path: tsAnalyzeParams.file_path })
      const result = schema.safeParse({ file_path: true })
      expect(result.success).toBe(false)
    })

    it('rejects null', () => {
      const schema = z.object({ file_path: tsAnalyzeParams.file_path })
      const result = schema.safeParse({ file_path: null })
      expect(result.success).toBe(false)
    })

    it('accepts empty string', () => {
      const schema = z.object({ file_path: tsAnalyzeParams.file_path })
      const result = schema.safeParse({ file_path: '' })
      expect(result.success).toBe(true)
      expect(result.data?.file_path).toBe('')
    })

    it('accepts absolute paths', () => {
      const schema = z.object({ file_path: tsAnalyzeParams.file_path })
      const result = schema.safeParse({ file_path: '/Users/home/project/src/file.ts' })
      expect(result.success).toBe(true)
    })

    it('accepts relative paths', () => {
      const schema = z.object({ file_path: tsAnalyzeParams.file_path })
      const result = schema.safeParse({ file_path: '../src/file.ts' })
      expect(result.success).toBe(true)
    })
  })

  describe('complete schema composition', () => {
    it('validates with the required field', () => {
      const schema = z.object(tsAnalyzeParams)
      const result = schema.safeParse({ file_path: 'src/example.ts' })
      expect(result.success).toBe(true)
    })

    it('rejects when file_path is missing', () => {
      const schema = z.object(tsAnalyzeParams)
      const result = schema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('strips unknown fields by default', () => {
      const schema = z.object(tsAnalyzeParams)
      const result = schema.safeParse({ file_path: 'src/example.ts', unknown_field: 'stripped' })
      expect(result.success).toBe(true)
      // eslint-disable-next-line local/no-any
      expect((result.data as any).unknown_field).toBeUndefined()
    })

    it('rejects unknown fields when using strict()', () => {
      const schema = z.object(tsAnalyzeParams).strict()
      const result = schema.safeParse({ file_path: 'src/example.ts', unknown_field: 'fail' })
      expect(result.success).toBe(false)
    })
  })
})
