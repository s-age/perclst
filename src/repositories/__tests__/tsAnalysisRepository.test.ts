import { describe, it, expect } from 'vitest'
import { TsAnalysisRepository } from '../tsAnalysisRepository'

describe('TsAnalysisRepository', () => {
  let repo: TsAnalysisRepository

  describe('getReferences', () => {
    repo = new TsAnalysisRepository()

    it('should find references to a class', () => {
      const refs = repo.getReferences('src/domains/analyze.ts', 'AnalyzeDomain')
      expect(refs.length).toBeGreaterThan(0)
    })

    it('should find a reference snippet containing the class name', () => {
      const refs = repo.getReferences('src/domains/analyze.ts', 'AnalyzeDomain')
      expect(refs.some((r) => r.snippet.includes('AnalyzeDomain'))).toBe(true)
    })

    it('should find references to a class method using ClassName.methodName format', () => {
      const refs = repo.getReferences('src/domains/analyze.ts', 'AnalyzeDomain.analyze')
      expect(refs.length).toBeGreaterThan(0)
    })

    it('should find the method definition snippet when using ClassName.methodName format', () => {
      const refs = repo.getReferences('src/domains/analyze.ts', 'AnalyzeDomain.analyze')
      expect(refs.some((r) => r.snippet === 'analyze')).toBe(true)
    })

    it('should find references to an async method', () => {
      const refs = repo.getReferences('src/domains/analyze.ts', 'AnalyzeDomain.getRewindTurns')
      expect(refs.length).toBeGreaterThan(0)
    })

    it('should find the async method snippet', () => {
      const refs = repo.getReferences('src/domains/analyze.ts', 'AnalyzeDomain.getRewindTurns')
      expect(refs.some((r) => r.snippet === 'getRewindTurns')).toBe(true)
    })

    it('should return empty array for a non-existent method', () => {
      const refs = repo.getReferences('src/domains/analyze.ts', 'AnalyzeDomain.nonExistent')
      expect(refs).toEqual([])
    })

    it('should return empty array for a non-existent class', () => {
      const refs = repo.getReferences('src/domains/analyze.ts', 'NonExistentClass.method')
      expect(refs).toEqual([])
    })

    it('should exclude __tests__ files by default', () => {
      const refs = repo.getReferences('src/domains/analyze.ts', 'AnalyzeDomain')
      expect(refs.some((r) => r.file_path.includes('__tests__'))).toBe(false)
    })

    it('should exclude __tests__ files when includeTest is false', () => {
      const refs = repo.getReferences('src/domains/analyze.ts', 'AnalyzeDomain', {
        includeTest: false
      })
      expect(refs.some((r) => r.file_path.includes('__tests__'))).toBe(false)
    })

    it('should include __tests__ files when includeTest is true', () => {
      const refs = repo.getReferences('src/domains/analyze.ts', 'AnalyzeDomain', {
        includeTest: true
      })
      expect(refs.some((r) => r.file_path.includes('__tests__'))).toBe(true)
    })

    it('should return more results with includeTest true than false', () => {
      const refsWithTests = repo.getReferences('src/domains/analyze.ts', 'AnalyzeDomain', {
        includeTest: true
      })
      const refsWithoutTests = repo.getReferences('src/domains/analyze.ts', 'AnalyzeDomain', {
        includeTest: false
      })
      expect(refsWithTests.length).toBeGreaterThan(refsWithoutTests.length)
    })

    it('should return same count with no option as with includeTest false', () => {
      const refsDefault = repo.getReferences('src/domains/analyze.ts', 'AnalyzeDomain')
      const refsExplicitFalse = repo.getReferences('src/domains/analyze.ts', 'AnalyzeDomain', {
        includeTest: false
      })
      expect(refsDefault.length).toBe(refsExplicitFalse.length)
    })
  })
})
