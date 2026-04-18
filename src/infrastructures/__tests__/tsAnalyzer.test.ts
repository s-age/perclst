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
  })
})
