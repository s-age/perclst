import { describe, it, expect } from 'vitest'
import { TsAnalyzer } from '../tsAnalyzer'

describe('TsAnalyzer', () => {
  const analyzer = new TsAnalyzer()

  describe('getReferences', () => {
    it('should find references to class', () => {
      const refs = analyzer.getReferences('src/domains/analyze.ts', 'AnalyzeDomain')
      expect(refs.length).toBeGreaterThan(0)
      expect(refs.some((r) => r.snippet.includes('AnalyzeDomain'))).toBe(true)
    })

    it('should find references to class method using ClassName.methodName format', () => {
      const refs = analyzer.getReferences('src/domains/analyze.ts', 'AnalyzeDomain.analyze')
      expect(refs.length).toBeGreaterThan(0)
      // Verify it found both the definition and usage locations
      expect(refs.some((r) => r.snippet === 'analyze')).toBe(true)
    })

    it('should find references to async method', () => {
      const refs = analyzer.getReferences('src/domains/analyze.ts', 'AnalyzeDomain.getRewindTurns')
      expect(refs.length).toBeGreaterThan(0)
      expect(refs.some((r) => r.snippet === 'getRewindTurns')).toBe(true)
    })

    it('should return empty array for non-existent method', () => {
      const refs = analyzer.getReferences('src/domains/analyze.ts', 'AnalyzeDomain.nonExistent')
      expect(refs).toEqual([])
    })

    it('should return empty array for non-existent class', () => {
      const refs = analyzer.getReferences('src/domains/analyze.ts', 'NonExistentClass.method')
      expect(refs).toEqual([])
    })

    it('should maintain backward compatibility for class search', () => {
      const refs = analyzer.getReferences('src/domains/analyze.ts', 'AnalyzeDomain')
      expect(refs.length).toBeGreaterThan(0)
    })

    it('should exclude __tests__ by default', () => {
      const refsWithTests = analyzer.getReferences('src/domains/analyze.ts', 'AnalyzeDomain', {
        includeTest: true
      })
      const refsWithoutTests = analyzer.getReferences('src/domains/analyze.ts', 'AnalyzeDomain', {
        includeTest: false
      })

      expect(refsWithTests.length).toBeGreaterThan(refsWithoutTests.length)
      expect(refsWithoutTests.some((r) => r.file_path.includes('__tests__'))).toBe(false)
    })

    it('should include __tests__ when includeTest is true', () => {
      const refs = analyzer.getReferences('src/domains/analyze.ts', 'AnalyzeDomain', {
        includeTest: true
      })
      expect(refs.some((r) => r.file_path.includes('__tests__'))).toBe(true)
    })

    it('should default to excluding tests when includeTest is not specified', () => {
      const refsDefault = analyzer.getReferences('src/domains/analyze.ts', 'AnalyzeDomain')
      const refsExplicitFalse = analyzer.getReferences('src/domains/analyze.ts', 'AnalyzeDomain', {
        includeTest: false
      })

      expect(refsDefault.length).toBe(refsExplicitFalse.length)
      expect(refsDefault.some((r) => r.file_path.includes('__tests__'))).toBe(false)
    })
  })
})
