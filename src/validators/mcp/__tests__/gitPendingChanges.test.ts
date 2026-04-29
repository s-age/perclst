import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { gitPendingChangesParams } from '../gitPendingChanges'

describe('gitPendingChangesParams', () => {
  const schema = z.object(gitPendingChangesParams)

  describe('schema structure', () => {
    it('should have exactly two fields', () => {
      expect(Object.keys(gitPendingChangesParams)).toHaveLength(2)
    })

    it('should have repo_path and extensions fields', () => {
      const keys = Object.keys(gitPendingChangesParams).sort()
      expect(keys).toEqual(['extensions', 'repo_path'])
    })

    it('should have a description for repo_path', () => {
      expect(gitPendingChangesParams.repo_path.description).toBeDefined()
    })

    it('should have a description for extensions', () => {
      expect(gitPendingChangesParams.extensions.description).toBeDefined()
    })
  })

  describe('valid inputs', () => {
    it('should accept empty object when all fields are omitted', () => {
      const result = schema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept repo_path as a string', () => {
      const result = schema.safeParse({ repo_path: '/Users/home/project' })
      expect(result.success).toBe(true)
      expect(result.data?.repo_path).toBe('/Users/home/project')
    })

    it('should accept extensions as an array of alphanumeric strings', () => {
      const result = schema.safeParse({ extensions: ['ts', 'tsx'] })
      expect(result.success).toBe(true)
      expect(result.data?.extensions).toEqual(['ts', 'tsx'])
    })

    it('should accept both fields together', () => {
      const input = { repo_path: '/tmp/repo', extensions: ['js'] }
      const result = schema.safeParse(input)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(input)
    })

    it('should accept an empty extensions array', () => {
      const result = schema.safeParse({ extensions: [] })
      expect(result.success).toBe(true)
      expect(result.data?.extensions).toEqual([])
    })

    it('should accept extensions with uppercase letters', () => {
      const result = schema.safeParse({ extensions: ['TSX'] })
      expect(result.success).toBe(true)
    })

    it('should accept extensions with digits', () => {
      const result = schema.safeParse({ extensions: ['mp4', 'h264'] })
      expect(result.success).toBe(true)
    })
  })

  describe('repo_path field validation', () => {
    it('should accept undefined repo_path', () => {
      const result = schema.safeParse({ repo_path: undefined })
      expect(result.success).toBe(true)
      expect(result.data?.repo_path).toBeUndefined()
    })

    it.each([
      ['number', 123],
      ['boolean', true],
      ['object', {}],
      ['array', []],
      ['null', null]
    ] as const)('should reject repo_path when it is %s', (_label, value) => {
      const result = schema.safeParse({ repo_path: value })
      expect(result.success).toBe(false)
    })
  })

  describe('extensions field validation', () => {
    it('should accept undefined extensions', () => {
      const result = schema.safeParse({ extensions: undefined })
      expect(result.success).toBe(true)
      expect(result.data?.extensions).toBeUndefined()
    })

    it.each([
      ['string', 'ts'],
      ['number', 42],
      ['boolean', false],
      ['object', {}],
      ['null', null]
    ] as const)('should reject extensions when it is %s', (_label, value) => {
      const result = schema.safeParse({ extensions: value })
      expect(result.success).toBe(false)
    })

    it('should reject extensions containing a dot-prefixed value', () => {
      const result = schema.safeParse({ extensions: ['.ts'] })
      expect(result.success).toBe(false)
    })

    it('should reject extensions containing a value with a hyphen', () => {
      const result = schema.safeParse({ extensions: ['type-script'] })
      expect(result.success).toBe(false)
    })

    it('should reject extensions containing a value with a space', () => {
      const result = schema.safeParse({ extensions: ['t s'] })
      expect(result.success).toBe(false)
    })

    it('should reject extensions containing an empty string', () => {
      const result = schema.safeParse({ extensions: [''] })
      expect(result.success).toBe(false)
    })

    it('should reject extensions containing a non-string element', () => {
      const result = schema.safeParse({ extensions: [123] })
      expect(result.success).toBe(false)
    })
  })

  describe('complete schema composition', () => {
    it('should strip unknown fields by default', () => {
      const result = schema.safeParse({ repo_path: '/tmp', unknown: 'stripped' })
      expect(result.success).toBe(true)
      // eslint-disable-next-line local/no-any
      expect((result.data as any).unknown).toBeUndefined()
    })

    it('should reject unknown fields when using strict()', () => {
      const strict = schema.strict()
      const result = strict.safeParse({ repo_path: '/tmp', extra: true })
      expect(result.success).toBe(false)
    })
  })
})
