import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { tsTestStrategistParams } from '../tsTestStrategist'

// eslint-disable-next-line local/no-any
function getDescription(schema: any): string | undefined {
  return schema.description
}

describe('tsTestStrategistParams schema', () => {
  it('exports an object with all required fields', () => {
    expect(tsTestStrategistParams).toBeDefined()
    expect(tsTestStrategistParams).toHaveProperty('target_file_path')
    expect(tsTestStrategistParams).toHaveProperty('test_file_path')
  })

  describe('target_file_path field', () => {
    it('is a Zod string schema', () => {
      expect(tsTestStrategistParams.target_file_path).toBeInstanceOf(z.ZodType)
    })

    it('is required', () => {
      const schema = z.object({ target_file_path: tsTestStrategistParams.target_file_path })
      expect(schema.safeParse({}).success).toBe(false)
    })

    it('accepts string values', () => {
      const schema = z.object({ target_file_path: tsTestStrategistParams.target_file_path })
      const result = schema.safeParse({ target_file_path: 'src/example.ts' })
      expect(result.success).toBe(true)
      expect(result.data?.target_file_path).toBe('src/example.ts')
    })

    it('has a description', () => {
      const description = getDescription(tsTestStrategistParams.target_file_path)
      expect(description).toBe('Path to the target TypeScript implementation file (.ts or .tsx)')
    })

    it('rejects arrays', () => {
      const schema = z.object({ target_file_path: tsTestStrategistParams.target_file_path })
      const result = schema.safeParse({ target_file_path: ['src/example.ts'] })
      expect(result.success).toBe(false)
    })

    it('rejects objects', () => {
      const schema = z.object({ target_file_path: tsTestStrategistParams.target_file_path })
      const result = schema.safeParse({ target_file_path: { path: 'example.ts' } })
      expect(result.success).toBe(false)
    })

    it('rejects booleans', () => {
      const schema = z.object({ target_file_path: tsTestStrategistParams.target_file_path })
      const result = schema.safeParse({ target_file_path: true })
      expect(result.success).toBe(false)
    })

    it('rejects null', () => {
      const schema = z.object({ target_file_path: tsTestStrategistParams.target_file_path })
      const result = schema.safeParse({ target_file_path: null })
      expect(result.success).toBe(false)
    })

    it('accepts .tsx extension', () => {
      const schema = z.object({ target_file_path: tsTestStrategistParams.target_file_path })
      const result = schema.safeParse({ target_file_path: 'src/Component.tsx' })
      expect(result.success).toBe(true)
    })

    it('accepts absolute paths', () => {
      const schema = z.object({ target_file_path: tsTestStrategistParams.target_file_path })
      const result = schema.safeParse({ target_file_path: '/Users/home/project/src/file.ts' })
      expect(result.success).toBe(true)
    })
  })

  describe('test_file_path field', () => {
    it('is a Zod schema', () => {
      expect(tsTestStrategistParams.test_file_path).toBeInstanceOf(z.ZodType)
    })

    it('is optional', () => {
      const schema = z.object({ test_file_path: tsTestStrategistParams.test_file_path })
      expect(schema.safeParse({}).success).toBe(true)
    })

    it('accepts string values', () => {
      const schema = z.object({ test_file_path: tsTestStrategistParams.test_file_path })
      const result = schema.safeParse({ test_file_path: 'src/__tests__/example.test.ts' })
      expect(result.success).toBe(true)
      expect(result.data?.test_file_path).toBe('src/__tests__/example.test.ts')
    })

    it('accepts undefined', () => {
      const schema = z.object({ test_file_path: tsTestStrategistParams.test_file_path })
      const result = schema.safeParse({ test_file_path: undefined })
      expect(result.success).toBe(true)
      expect(result.data?.test_file_path).toBeUndefined()
    })

    it('has a description', () => {
      const description = getDescription(tsTestStrategistParams.test_file_path)
      expect(description).toBe('Path to the corresponding test file (auto-discovered if omitted)')
    })

    it('rejects arrays', () => {
      const schema = z.object({ test_file_path: tsTestStrategistParams.test_file_path })
      const result = schema.safeParse({ test_file_path: ['src/__tests__/example.test.ts'] })
      expect(result.success).toBe(false)
    })

    it('rejects booleans', () => {
      const schema = z.object({ test_file_path: tsTestStrategistParams.test_file_path })
      const result = schema.safeParse({ test_file_path: true })
      expect(result.success).toBe(false)
    })

    it('rejects null', () => {
      const schema = z.object({ test_file_path: tsTestStrategistParams.test_file_path })
      const result = schema.safeParse({ test_file_path: null })
      expect(result.success).toBe(false)
    })
  })

  describe('complete schema composition', () => {
    it('validates with required field only', () => {
      const schema = z.object(tsTestStrategistParams)
      const result = schema.safeParse({ target_file_path: 'src/example.ts' })
      expect(result.success).toBe(true)
    })

    it('validates with all fields provided', () => {
      const schema = z.object(tsTestStrategistParams)
      const result = schema.safeParse({
        target_file_path: 'src/example.ts',
        test_file_path: 'src/__tests__/example.test.ts'
      })
      expect(result.success).toBe(true)
    })

    it('rejects when target_file_path is missing', () => {
      const schema = z.object(tsTestStrategistParams)
      const result = schema.safeParse({ test_file_path: 'src/__tests__/example.test.ts' })
      expect(result.success).toBe(false)
    })

    it('rejects when both fields are missing', () => {
      const schema = z.object(tsTestStrategistParams)
      const result = schema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('strips unknown fields by default', () => {
      const schema = z.object(tsTestStrategistParams)
      const result = schema.safeParse({
        target_file_path: 'src/example.ts',
        unknown_field: 'stripped'
      })
      expect(result.success).toBe(true)
      // eslint-disable-next-line local/no-any
      expect((result.data as any).unknown_field).toBeUndefined()
    })

    it('rejects unknown fields when using strict()', () => {
      const schema = z.object(tsTestStrategistParams).strict()
      const result = schema.safeParse({
        target_file_path: 'src/example.ts',
        unknown_field: 'fail'
      })
      expect(result.success).toBe(false)
    })
  })
})
