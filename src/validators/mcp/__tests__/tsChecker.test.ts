import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { tsCheckerParams } from '../tsChecker'

// Helper to safely extract Zod description
// eslint-disable-next-line local/no-any
function getDescription(schema: any): string | undefined {
  return schema.description
}

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
      const description = getDescription(tsCheckerParams.project_root)
      expect(description).toBe('Absolute path to the project root. Auto-detected when omitted.')
    })

    it('rejects arrays', () => {
      const schema = z.object({ project_root: tsCheckerParams.project_root })
      const result = schema.safeParse({ project_root: ['path'] })
      expect(result.success).toBe(false)
    })

    it('rejects objects', () => {
      const schema = z.object({ project_root: tsCheckerParams.project_root })
      const result = schema.safeParse({ project_root: { path: 'root' } })
      expect(result.success).toBe(false)
    })

    it('rejects booleans', () => {
      const schema = z.object({ project_root: tsCheckerParams.project_root })
      const result = schema.safeParse({ project_root: true })
      expect(result.success).toBe(false)
    })

    it('rejects null', () => {
      const schema = z.object({ project_root: tsCheckerParams.project_root })
      const result = schema.safeParse({ project_root: null })
      expect(result.success).toBe(false)
    })

    it('accepts empty string', () => {
      const schema = z.object({ project_root: tsCheckerParams.project_root })
      const result = schema.safeParse({ project_root: '' })
      expect(result.success).toBe(true)
      expect(result.data?.project_root).toBe('')
    })

    it('accepts whitespace-only string', () => {
      const schema = z.object({ project_root: tsCheckerParams.project_root })
      const result = schema.safeParse({ project_root: '   ' })
      expect(result.success).toBe(true)
      expect(result.data?.project_root).toBe('   ')
    })

    it('accepts special characters in path', () => {
      const schema = z.object({ project_root: tsCheckerParams.project_root })
      const result = schema.safeParse({ project_root: '/path/with-special_chars@123' })
      expect(result.success).toBe(true)
    })

    it('accepts unicode paths', () => {
      const schema = z.object({ project_root: tsCheckerParams.project_root })
      const result = schema.safeParse({ project_root: '/路径/项目' })
      expect(result.success).toBe(true)
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
      const description = getDescription(tsCheckerParams.lint_command)
      expect(description).toBe('Lint command. Defaults to "npm run lint:fix".')
    })

    it('rejects arrays', () => {
      const schema = z.object({ lint_command: tsCheckerParams.lint_command })
      expect(schema.safeParse({ lint_command: ['npm', 'run'] }).success).toBe(false)
    })

    it('rejects objects', () => {
      const schema = z.object({ lint_command: tsCheckerParams.lint_command })
      expect(schema.safeParse({ lint_command: { cmd: 'lint' } }).success).toBe(false)
    })

    it('rejects booleans', () => {
      const schema = z.object({ lint_command: tsCheckerParams.lint_command })
      expect(schema.safeParse({ lint_command: false }).success).toBe(false)
    })

    it('rejects null', () => {
      const schema = z.object({ lint_command: tsCheckerParams.lint_command })
      expect(schema.safeParse({ lint_command: null }).success).toBe(false)
    })

    it('accepts empty string', () => {
      const schema = z.object({ lint_command: tsCheckerParams.lint_command })
      const result = schema.safeParse({ lint_command: '' })
      expect(result.success).toBe(true)
    })

    it('accepts whitespace-only string', () => {
      const schema = z.object({ lint_command: tsCheckerParams.lint_command })
      const result = schema.safeParse({ lint_command: '  \t\n  ' })
      expect(result.success).toBe(true)
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
      const description = getDescription(tsCheckerParams.build_command)
      expect(description).toBe('Build command. Defaults to "npm run build".')
    })

    it('rejects arrays', () => {
      const schema = z.object({ build_command: tsCheckerParams.build_command })
      expect(schema.safeParse({ build_command: [] }).success).toBe(false)
    })

    it('rejects objects', () => {
      const schema = z.object({ build_command: tsCheckerParams.build_command })
      expect(schema.safeParse({ build_command: {} }).success).toBe(false)
    })

    it('rejects booleans', () => {
      const schema = z.object({ build_command: tsCheckerParams.build_command })
      expect(schema.safeParse({ build_command: true }).success).toBe(false)
    })

    it('rejects null', () => {
      const schema = z.object({ build_command: tsCheckerParams.build_command })
      expect(schema.safeParse({ build_command: null }).success).toBe(false)
    })

    it('accepts empty string', () => {
      const schema = z.object({ build_command: tsCheckerParams.build_command })
      const result = schema.safeParse({ build_command: '' })
      expect(result.success).toBe(true)
    })

    it('accepts whitespace-only string', () => {
      const schema = z.object({ build_command: tsCheckerParams.build_command })
      const result = schema.safeParse({ build_command: '   ' })
      expect(result.success).toBe(true)
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
      const description = getDescription(tsCheckerParams.test_command)
      expect(description).toBe('Test command. Defaults to "npm run test:unit".')
    })

    it('rejects arrays', () => {
      const schema = z.object({ test_command: tsCheckerParams.test_command })
      expect(schema.safeParse({ test_command: ['test'] }).success).toBe(false)
    })

    it('rejects objects', () => {
      const schema = z.object({ test_command: tsCheckerParams.test_command })
      expect(schema.safeParse({ test_command: { run: 'test' } }).success).toBe(false)
    })

    it('rejects booleans', () => {
      const schema = z.object({ test_command: tsCheckerParams.test_command })
      expect(schema.safeParse({ test_command: false }).success).toBe(false)
    })

    it('rejects null', () => {
      const schema = z.object({ test_command: tsCheckerParams.test_command })
      expect(schema.safeParse({ test_command: null }).success).toBe(false)
    })

    it('accepts empty string', () => {
      const schema = z.object({ test_command: tsCheckerParams.test_command })
      const result = schema.safeParse({ test_command: '' })
      expect(result.success).toBe(true)
    })

    it('accepts whitespace-only string', () => {
      const schema = z.object({ test_command: tsCheckerParams.test_command })
      const result = schema.safeParse({ test_command: '   ' })
      expect(result.success).toBe(true)
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

    it('strips unknown fields by default', () => {
      const schema = z.object(tsCheckerParams)
      const result = schema.safeParse({
        project_root: '/project',
        unknown_field: 'will be stripped'
      })
      expect(result.success).toBe(true)
      // eslint-disable-next-line local/no-any
      expect((result.data as any).unknown_field).toBeUndefined()
    })

    it('rejects unknown fields when using strict()', () => {
      const schema = z.object(tsCheckerParams).strict()
      const result = schema.safeParse({
        project_root: '/project',
        unknown_field: 'will fail in strict mode'
      })
      expect(result.success).toBe(false)
    })

    it('preserves extra fields when using passthrough', () => {
      const schema = z.object(tsCheckerParams).passthrough()
      const result = schema.safeParse({
        project_root: '/project',
        unknown_field: 'preserved with passthrough'
      })
      expect(result.success).toBe(true)
      // eslint-disable-next-line local/no-any
      expect((result.data as any).unknown_field).toBe('preserved with passthrough')
    })
  })
})
