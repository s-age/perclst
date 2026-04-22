import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Project } from 'ts-morph'
import { TsAnalyzer } from '../tsAnalyzer'

vi.mock('ts-morph')

describe('TsAnalyzer', () => {
  let mockAddSourceFileAtPath: ReturnType<typeof vi.fn>
  let mockAddSourceFileAtPathIfExists: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockAddSourceFileAtPath = vi.fn()
    mockAddSourceFileAtPathIfExists = vi.fn()
    vi.mocked(Project).mockImplementation(function (this: any) {
      this.addSourceFileAtPath = mockAddSourceFileAtPath
      this.addSourceFileAtPathIfExists = mockAddSourceFileAtPathIfExists
      return this
    })
  })

  describe('constructor', () => {
    it('should create an instance with default options', () => {
      expect(() => new TsAnalyzer()).not.toThrow()
    })

    it('should pass tsconfig.json to Project by default', () => {
      new TsAnalyzer()
      expect(vi.mocked(Project)).toHaveBeenCalledWith({ tsConfigFilePath: 'tsconfig.json' })
    })

    it('should create an instance when skipAddingFilesFromTsConfig is true', () => {
      expect(() => new TsAnalyzer({ skipAddingFilesFromTsConfig: true })).not.toThrow()
    })

    it('should pass skipAddingFilesFromTsConfig to Project', () => {
      new TsAnalyzer({ skipAddingFilesFromTsConfig: true })
      expect(vi.mocked(Project)).toHaveBeenCalledWith({ skipAddingFilesFromTsConfig: true })
    })

    it('should create an instance with an explicit tsConfigFilePath', () => {
      expect(() => new TsAnalyzer({ tsConfigFilePath: 'tsconfig.json' })).not.toThrow()
    })

    it('should pass the explicit tsConfigFilePath to Project', () => {
      new TsAnalyzer({ tsConfigFilePath: 'custom.tsconfig.json' })
      expect(vi.mocked(Project)).toHaveBeenCalledWith({ tsConfigFilePath: 'custom.tsconfig.json' })
    })
  })

  describe('getSourceFile', () => {
    const mockSourceFile = { getFilePath: () => '/abs/src/domains/analyze.ts' }
    let analyzer: TsAnalyzer

    beforeEach(() => {
      mockAddSourceFileAtPath.mockReturnValue(mockSourceFile)
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
      mockAddSourceFileAtPath.mockImplementation(() => {
        throw new Error('File not found')
      })
      expect(() => analyzer.getSourceFile('src/domains/nonExistentFile.ts')).toThrow()
    })
  })

  describe('getSourceFileIfExists', () => {
    const mockSourceFile = { getFilePath: () => '/abs/src/domains/analyze.ts' }
    let analyzer: TsAnalyzer

    beforeEach(() => {
      analyzer = new TsAnalyzer()
    })

    it('should return a SourceFile for an existing path', () => {
      mockAddSourceFileAtPathIfExists.mockReturnValue(mockSourceFile)
      const sf = analyzer.getSourceFileIfExists('src/domains/analyze.ts')
      expect(sf).toBeDefined()
    })

    it('should return undefined for a non-existent path', () => {
      mockAddSourceFileAtPathIfExists.mockReturnValue(undefined)
      const sf = analyzer.getSourceFileIfExists('src/domains/nonExistentFile.ts')
      expect(sf).toBeUndefined()
    })
  })

  describe('constructor with skipAddingFilesFromTsConfig: true', () => {
    const mockSourceFile = { getFilePath: () => '/abs/src/domains/analyze.ts' }
    let analyzer: TsAnalyzer

    beforeEach(() => {
      analyzer = new TsAnalyzer({ skipAddingFilesFromTsConfig: true })
    })

    it('should still resolve a file by path via getSourceFileIfExists', () => {
      mockAddSourceFileAtPathIfExists.mockReturnValue(mockSourceFile)
      const sf = analyzer.getSourceFileIfExists('src/domains/analyze.ts')
      expect(sf).toBeDefined()
    })

    it('should return undefined for a non-existent path', () => {
      mockAddSourceFileAtPathIfExists.mockReturnValue(undefined)
      const sf = analyzer.getSourceFileIfExists('src/domains/nonExistentFile.ts')
      expect(sf).toBeUndefined()
    })

    it('should throw via getSourceFile for a non-existent path', () => {
      mockAddSourceFileAtPath.mockImplementation(() => {
        throw new Error('File not found')
      })
      expect(() => analyzer.getSourceFile('src/domains/nonExistentFile.ts')).toThrow()
    })
  })
})
