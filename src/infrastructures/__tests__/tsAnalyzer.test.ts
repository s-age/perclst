import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Project } from 'ts-morph'
import { TsAnalyzer } from '../tsAnalyzer'

vi.mock('ts-morph')

describe('TsAnalyzer', () => {
  let mockAddSourceFileAtPath: ReturnType<typeof vi.fn>
  let mockAddSourceFileAtPathIfExists: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockAddSourceFileAtPath = vi.fn()
    mockAddSourceFileAtPathIfExists = vi.fn()
    vi.mocked(Project).mockImplementation(function (this: object) {
      Object.assign(this, {
        addSourceFileAtPath: mockAddSourceFileAtPath,
        addSourceFileAtPathIfExists: mockAddSourceFileAtPathIfExists
      })
      return this as unknown as InstanceType<typeof Project>
    })
  })

  describe('constructor', () => {
    it('should create an instance with default options without calling Project', () => {
      expect(() => new TsAnalyzer()).not.toThrow()
      expect(vi.mocked(Project)).not.toHaveBeenCalled()
    })

    it('should pass tsconfig.json to Project on first file access', () => {
      const analyzer = new TsAnalyzer()
      mockAddSourceFileAtPath.mockReturnValue({})
      analyzer.getSourceFile('any.ts')
      expect(vi.mocked(Project)).toHaveBeenCalledWith({ tsConfigFilePath: 'tsconfig.json' })
    })

    it('should create an instance when skipAddingFilesFromTsConfig is true without calling Project', () => {
      expect(() => new TsAnalyzer({ skipAddingFilesFromTsConfig: true })).not.toThrow()
      expect(vi.mocked(Project)).not.toHaveBeenCalled()
    })

    it('should pass skipAddingFilesFromTsConfig to Project on first file access', () => {
      const analyzer = new TsAnalyzer({ skipAddingFilesFromTsConfig: true })
      mockAddSourceFileAtPathIfExists.mockReturnValue(undefined)
      analyzer.getSourceFileIfExists('any.ts')
      expect(vi.mocked(Project)).toHaveBeenCalledWith({ skipAddingFilesFromTsConfig: true })
    })

    it('should create an instance with an explicit tsConfigFilePath without calling Project', () => {
      expect(() => new TsAnalyzer({ tsConfigFilePath: 'tsconfig.json' })).not.toThrow()
      expect(vi.mocked(Project)).not.toHaveBeenCalled()
    })

    it('should pass the explicit tsConfigFilePath to Project on first file access', () => {
      const analyzer = new TsAnalyzer({ tsConfigFilePath: 'custom.tsconfig.json' })
      mockAddSourceFileAtPath.mockReturnValue({})
      analyzer.getSourceFile('any.ts')
      expect(vi.mocked(Project)).toHaveBeenCalledWith({ tsConfigFilePath: 'custom.tsconfig.json' })
    })

    it('should reuse the same Project instance across multiple calls', () => {
      const analyzer = new TsAnalyzer()
      mockAddSourceFileAtPath.mockReturnValue({})
      analyzer.getSourceFile('a.ts')
      analyzer.getSourceFile('b.ts')
      expect(vi.mocked(Project)).toHaveBeenCalledTimes(1)
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
