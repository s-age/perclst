import { describe, it, expect } from 'vitest'
import { TsAnalyzer } from '../tsAnalyzer'

describe('TsAnalyzer', () => {
  const analyzer = new TsAnalyzer()

  describe('getSourceFile', () => {
    it('should return a SourceFile for a valid path', () => {
      const sf = analyzer.getSourceFile('src/domains/analyze.ts')
      expect(sf).toBeDefined()
    })

    it('should return a SourceFile whose file path matches the requested path', () => {
      const sf = analyzer.getSourceFile('src/domains/analyze.ts')
      expect(sf.getFilePath()).toContain('analyze.ts')
    })
  })

  describe('getSourceFileIfExists', () => {
    it('should return a SourceFile for an existing path', () => {
      const sf = analyzer.getSourceFileIfExists('src/domains/analyze.ts')
      expect(sf).toBeDefined()
    })

    it('should return undefined for a non-existent path', () => {
      const sf = analyzer.getSourceFileIfExists('src/domains/nonExistentFile.ts')
      expect(sf).toBeUndefined()
    })
  })
})
