import { describe, it, expect, beforeEach } from 'vitest'
import { TsAnalyzer } from '../tsAnalyzer'

describe('TsAnalyzer', () => {
  describe('constructor', () => {
    it('should create an instance with default options', () => {
      expect(() => new TsAnalyzer()).not.toThrow()
    })

    it('should create an instance when skipAddingFilesFromTsConfig is true', () => {
      expect(() => new TsAnalyzer({ skipAddingFilesFromTsConfig: true })).not.toThrow()
    })

    it('should create an instance with an explicit tsConfigFilePath', () => {
      expect(() => new TsAnalyzer({ tsConfigFilePath: 'tsconfig.json' })).not.toThrow()
    })
  })

  describe('getSourceFile', () => {
    let analyzer: TsAnalyzer

    beforeEach(() => {
      analyzer = new TsAnalyzer()
    })

    it('should return a SourceFile for a valid path', () => {
      const sf = analyzer.getSourceFile('src/domains/analyze.ts')
      expect(sf).toBeDefined()
    })

    it('should return a SourceFile whose file path contains the requested file name', () => {
      const sf = analyzer.getSourceFile('src/domains/analyze.ts')
      expect(sf.getFilePath()).toContain('analyze.ts')
    })

    it('should throw when the file path does not exist', () => {
      expect(() => analyzer.getSourceFile('src/domains/nonExistentFile.ts')).toThrow()
    })
  })

  describe('getSourceFileIfExists', () => {
    let analyzer: TsAnalyzer

    beforeEach(() => {
      analyzer = new TsAnalyzer()
    })

    it('should return a SourceFile for an existing path', () => {
      const sf = analyzer.getSourceFileIfExists('src/domains/analyze.ts')
      expect(sf).toBeDefined()
    })

    it('should return undefined for a non-existent path', () => {
      const sf = analyzer.getSourceFileIfExists('src/domains/nonExistentFile.ts')
      expect(sf).toBeUndefined()
    })
  })

  describe('constructor with skipAddingFilesFromTsConfig: true', () => {
    let analyzer: TsAnalyzer

    beforeEach(() => {
      analyzer = new TsAnalyzer({ skipAddingFilesFromTsConfig: true })
    })

    it('should still resolve a file by path via getSourceFileIfExists', () => {
      const sf = analyzer.getSourceFileIfExists('src/domains/analyze.ts')
      expect(sf).toBeDefined()
    })

    it('should return undefined for a non-existent path', () => {
      const sf = analyzer.getSourceFileIfExists('src/domains/nonExistentFile.ts')
      expect(sf).toBeUndefined()
    })

    it('should throw via getSourceFile for a non-existent path', () => {
      expect(() => analyzer.getSourceFile('src/domains/nonExistentFile.ts')).toThrow()
    })
  })
})
