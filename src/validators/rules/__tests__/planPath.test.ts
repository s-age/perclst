import { describe, it, expect } from 'vitest'
import { planPathRule } from '../planPath'

describe('planPathRule', () => {
  const schema = planPathRule()

  describe('valid paths', () => {
    it('accepts plans/ prefix', () => {
      const result = schema.safeParse('plans/foo.md')
      expect(result.success).toBe(true)
    })

    it('accepts ./ prefix and normalizes it', () => {
      const result = schema.safeParse('./plans/foo.md')
      expect(result.success).toBe(true)
      if (result.success) expect(result.data).toBe('plans/foo.md')
    })

    it('accepts nested path within plans/', () => {
      const result = schema.safeParse('plans/subdir/feature.md')
      expect(result.success).toBe(true)
    })

    it('strips ./ prefix from output', () => {
      const result = schema.safeParse('./plans/cli-e2e-infra-di.md')
      expect(result.success).toBe(true)
      if (result.success) expect(result.data).toBe('plans/cli-e2e-infra-di.md')
    })
  })

  describe('path traversal rejection', () => {
    it('rejects .. segments', () => {
      const result = schema.safeParse('../etc/shadow.md')
      expect(result.success).toBe(false)
    })

    it('rejects embedded .. in path', () => {
      const result = schema.safeParse('plans/../secret.md')
      expect(result.success).toBe(false)
    })

    it('rejects ../ after ./', () => {
      const result = schema.safeParse('./plans/../../etc/shadow.md')
      expect(result.success).toBe(false)
    })
  })

  describe('plans/ prefix enforcement', () => {
    it('rejects absolute path', () => {
      const result = schema.safeParse('/absolute/path.md')
      expect(result.success).toBe(false)
    })

    it('rejects path outside plans/', () => {
      const result = schema.safeParse('src/something.md')
      expect(result.success).toBe(false)
    })
  })

  describe('.md extension enforcement', () => {
    it('rejects .json extension', () => {
      const result = schema.safeParse('plans/foo.json')
      expect(result.success).toBe(false)
    })

    it('rejects no extension', () => {
      const result = schema.safeParse('plans/foo')
      expect(result.success).toBe(false)
    })
  })

  describe('empty input', () => {
    it('rejects empty string', () => {
      const result = schema.safeParse('')
      expect(result.success).toBe(false)
    })
  })
})
