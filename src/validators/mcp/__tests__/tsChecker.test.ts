import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { tsCheckerParams } from '../tsChecker'

describe('tsCheckerParams schema', () => {
  it('exports an object with all required fields', () => {
    expect(tsCheckerParams).toBeDefined()
    expect(tsCheckerParams).toHaveProperty('project_root')
    expect(tsCheckerParams).toHaveProperty('lint_command')
    expect(tsCheckerParams).toHaveProperty('build_command')
    expect(tsCheckerParams).toHaveProperty('test_command')
  })

  describe('project_root field', () => {
    it('is a Zod string schema', () => {
      expect(tsCheckerParams.project_root).toBeInstanceOf(z.ZodType)
    })

    it('is optional', () => {
      const schema = z.object({ project_root: tsCheckerParams.project_root })
      expect(schema.safeParse({}).success).toBe(true)
    })

    it('accepts string values', () => {
      const schema = z.object({ project_root: tsCheckerParams.project_root })
      const result = schema.safeParse({ project_root: '/path/to/root' })
      expect(result.success).toBe(true)
      expect(result.data?.project_root).toBe('/path/to/root')
    })

    it('has a description', () => {
      const description = (tsCheckerParams.project_root as any).description
      expect(description).toBeDefined()
      expect(description).toContain('Absolute path')
    })
  })

  describe('lint_command field', () => {
    it('is a Zod string schema', () => {
      expect(tsCheckerParams.lint_command).toBeInstanceOf(z.ZodType)
    })

    it('is optional', () => {
      const schema = z.object({ lint_command: tsCheckerParams.lint_command })
      expect(schema.safeParse({}).success).toBe(true)
    })

    it('accepts string values', () => {
      const schema = z.object({ lint_command: tsCheckerParams.lint_command })
      const result = schema.safeParse({ lint_command: 'npm run lint:fix' })
      expect(result.success).toBe(true)
      expect(result.data?.lint_command).toBe('npm run lint:fix')
    })

    it('has a description', () => {
      const description = (tsCheckerParams.lint_command as any).description
      expect(description).toBeDefined()
      expect(description).toContain('Lint command')
    })
  })

  describe('build_command field', () => {
    it('is a Zod string schema', () => {
      expect(tsCheckerParams.build_command).toBeInstanceOf(z.ZodType)
    })

    it('is optional', () => {
      const schema = z.object({ build_command: tsCheckerParams.build_command })
      expect(schema.safeParse({}).success).toBe(true)
    })

    it('accepts string values', () => {
      const schema = z.object({ build_command: tsCheckerParams.build_command })
      const result = schema.safeParse({ build_command: 'npm run build' })
      expect(result.success).toBe(true)
      expect(result.data?.build_command).toBe('npm run build')
    })

    it('has a description', () => {
      const description = (tsCheckerParams.build_command as any).description
      expect(description).toBeDefined()
      expect(description).toContain('Build command')
    })
  })

  describe('test_command field', () => {
    it('is a Zod string schema', () => {
      expect(tsCheckerParams.test_command).toBeInstanceOf(z.ZodType)
    })

    it('is optional', () => {
      const schema = z.object({ test_command: tsCheckerParams.test_command })
      expect(schema.safeParse({}).success).toBe(true)
    })

    it('accepts string values', () => {
      const schema = z.object({ test_command: tsCheckerParams.test_command })
      const result = schema.safeParse({ test_command: 'npm run test:unit' })
      expect(result.success).toBe(true)
      expect(result.data?.test_command).toBe('npm run test:unit')
    })

    it('has a description', () => {
      const description = (tsCheckerParams.test_command as any).description
      expect(description).toBeDefined()
      expect(description).toContain('Test command')
    })
  })

  describe('complete schema composition', () => {
    it('validates empty object', () => {
      const schema = z.object(tsCheckerParams)
      expect(schema.safeParse({}).success).toBe(true)
    })

    it('validates with all fields provided', () => {
      const schema = z.object(tsCheckerParams)
      const result = schema.safeParse({
        project_root: '/project',
        lint_command: 'npm run lint',
        build_command: 'npm run build',
        test_command: 'npm run test'
      })
      expect(result.success).toBe(true)
    })

    it('validates with partial fields', () => {
      const schema = z.object(tsCheckerParams)
      const result = schema.safeParse({
        project_root: '/project',
        build_command: 'npm run build'
      })
      expect(result.success).toBe(true)
    })

    it('rejects non-string values', () => {
      const schema = z.object(tsCheckerParams)
      const result = schema.safeParse({
        project_root: 123
      })
      expect(result.success).toBe(false)
    })
  })
})
