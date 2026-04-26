import { vi, describe, it, expect, beforeEach } from 'vitest'
import { TsAnalysisDomain } from '../tsAnalysis'
import type { ITsAnalysisRepository } from '@src/repositories/ports/tsAnalysis'
import type { TypeScriptAnalysis, ReferenceInfo, TypeDefinition } from '@src/types/tsAnalysis'

describe('TsAnalysisDomain', () => {
  let mockRepo: Record<keyof ITsAnalysisRepository, ReturnType<typeof vi.fn>>
  let domain: TsAnalysisDomain

  beforeEach(() => {
    vi.clearAllMocks()
    mockRepo = {
      analyzeFile: vi.fn(),
      getReferences: vi.fn(),
      findContainingSymbol: vi.fn(),
      getTypeDefinitions: vi.fn()
    }
    domain = new TsAnalysisDomain(mockRepo as unknown as ITsAnalysisRepository)
  })

  describe('analyze', () => {
    it('should call repo.analyzeFile with file path', () => {
      const filePath = '/path/to/file.ts'
      const mockAnalysis: TypeScriptAnalysis = {
        file_path: filePath,
        symbols: [],
        imports: [],
        exports: []
      }
      mockRepo.analyzeFile.mockReturnValue(mockAnalysis)

      const result = domain.analyze(filePath)

      expect(mockRepo.analyzeFile).toHaveBeenCalledWith(filePath)
      expect(result).toEqual(mockAnalysis)
    })
  })

  describe('getReferences', () => {
    it('should call repo.getReferences with file path, symbol name, and options', () => {
      const filePath = '/path/to/file.ts'
      const symbolName = 'myFunction'
      const options = { includeTest: true }
      const mockRefs: ReferenceInfo[] = [
        { file_path: '/path/to/other.ts', line: 10, column: 5, snippet: '' }
      ]
      mockRepo.getReferences.mockReturnValue(mockRefs)

      const result = domain.getReferences(filePath, symbolName, options)

      expect(mockRepo.getReferences).toHaveBeenCalledWith(filePath, symbolName, options)
      expect(result).toEqual(mockRefs)
    })

    it('should call repo.getReferences without options when not provided', () => {
      const filePath = '/path/to/file.ts'
      const symbolName = 'myFunction'
      mockRepo.getReferences.mockReturnValue([])

      domain.getReferences(filePath, symbolName)

      expect(mockRepo.getReferences).toHaveBeenCalledWith(filePath, symbolName, undefined)
    })
  })

  describe('getReferencesRecursive', () => {
    it('should call collectReferencesRecursive with initial empty visited set', () => {
      const filePath = '/path/to/file.ts'
      const symbolName = 'myFunction'
      mockRepo.getReferences.mockReturnValue([])

      domain.getReferencesRecursive(filePath, symbolName)

      expect(mockRepo.getReferences).toHaveBeenCalled()
    })

    it('should return results from collectReferencesRecursive', () => {
      const filePath = '/path/to/file.ts'
      const symbolName = 'myFunction'
      const mockRef: ReferenceInfo = {
        file_path: '/path/to/other.ts',
        line: 10,
        column: 5,
        snippet: ''
      }
      mockRepo.getReferences.mockReturnValue([mockRef])
      mockRepo.findContainingSymbol.mockReturnValue(null)

      const result = domain.getReferencesRecursive(filePath, symbolName)

      expect(result).toEqual([mockRef])
    })
  })

  describe('collectReferencesRecursive', () => {
    it('should return direct references when findContainingSymbol returns null', () => {
      const filePath = '/path/to/file.ts'
      const symbolName = 'myFunction'
      const ref1: ReferenceInfo = {
        file_path: '/path/to/caller1.ts',
        line: 10,
        column: 5,
        snippet: ''
      }
      const ref2: ReferenceInfo = {
        file_path: '/path/to/caller2.ts',
        line: 20,
        column: 8,
        snippet: ''
      }
      mockRepo.getReferences.mockReturnValue([ref1, ref2])
      mockRepo.findContainingSymbol.mockReturnValue(null)

      const result = domain.getReferencesRecursive(filePath, symbolName)

      expect(result).toHaveLength(2)
      expect(result).toEqual([ref1, ref2])
    })

    it('should enrich references with caller information when containing symbol is found', () => {
      const filePath = '/path/to/file.ts'
      const symbolName = 'myFunction'
      const ref: ReferenceInfo = {
        file_path: '/path/to/caller.ts',
        line: 10,
        column: 5,
        snippet: ''
      }
      const containing = {
        symbol_name: 'callerFunc',
        file_path: '/path/to/caller.ts',
        line: 5,
        column: 0
      }
      mockRepo.getReferences
        .mockReturnValueOnce([ref]) // First call: myFunction references
        .mockReturnValueOnce([]) // Second call: callerFunc references (recursive)
      mockRepo.findContainingSymbol.mockReturnValue(containing)

      const result = domain.getReferencesRecursive(filePath, symbolName)

      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('caller')
      expect(result[0].caller?.symbol_name).toBe('callerFunc')
      expect(result[0].caller?.file_path).toBe('/path/to/caller.ts')
      expect(result[0].caller?.references).toEqual([])
    })

    it('should prevent infinite recursion using visited set', () => {
      const filePath = '/path/to/file.ts'
      const symbolName = 'myFunction'
      const ref: ReferenceInfo = {
        file_path: '/path/to/caller.ts',
        line: 10,
        column: 5,
        snippet: ''
      }
      const containing = {
        symbol_name: 'myFunction',
        file_path: filePath,
        line: 5,
        column: 0
      }
      mockRepo.getReferences.mockReturnValueOnce([ref]) // First call: myFunction references
      // No second call because the recursive call hits visited set
      mockRepo.findContainingSymbol.mockReturnValue(containing)

      const result = domain.getReferencesRecursive(filePath, symbolName)

      // Visited set should prevent the recursive call from proceeding,
      // so caller.references should be empty
      expect(result).toHaveLength(1)
      expect(result[0].caller?.references).toEqual([])
    })

    it('should cache caller references to avoid redundant work', () => {
      const filePath = '/path/to/file.ts'
      const symbolName = 'myFunction'
      const ref1: ReferenceInfo = {
        file_path: '/path/to/caller.ts',
        line: 10,
        column: 5,
        snippet: ''
      }
      const ref2: ReferenceInfo = {
        file_path: '/path/to/caller.ts',
        line: 15,
        column: 8,
        snippet: ''
      }
      const containing = {
        symbol_name: 'callerFunc',
        file_path: '/path/to/caller.ts',
        line: 5,
        column: 0
      }
      mockRepo.getReferences
        .mockReturnValueOnce([ref1, ref2]) // First call returns both refs
        .mockReturnValueOnce([]) // Recursive call for callerFunc
      mockRepo.findContainingSymbol.mockReturnValue(containing)

      const result = domain.getReferencesRecursive(filePath, symbolName)

      // Both refs should share the same caller references array
      expect(result).toHaveLength(2)
      expect(result[0].caller?.references).toBe(result[1].caller?.references)
      // getReferences should be called twice (once for myFunction, once for callerFunc)
      expect(mockRepo.getReferences).toHaveBeenCalledTimes(2)
    })
  })

  describe('getTypeDefinitions', () => {
    it('should call repo.getTypeDefinitions with file path and symbol name', () => {
      const filePath = '/path/to/file.ts'
      const symbolName = 'MyType'
      const mockTypeDef: TypeDefinition = {
        name: 'MyType',
        type: 'interface',
        properties: []
      }
      mockRepo.getTypeDefinitions.mockReturnValue(mockTypeDef)

      const result = domain.getTypeDefinitions(filePath, symbolName)

      expect(mockRepo.getTypeDefinitions).toHaveBeenCalledWith(filePath, symbolName)
      expect(result).toEqual(mockTypeDef)
    })

    it('should return null when type definition is not found', () => {
      const filePath = '/path/to/file.ts'
      const symbolName = 'NonExistentType'
      mockRepo.getTypeDefinitions.mockReturnValue(null)

      const result = domain.getTypeDefinitions(filePath, symbolName)

      expect(mockRepo.getTypeDefinitions).toHaveBeenCalledWith(filePath, symbolName)
      expect(result).toBeNull()
    })
  })
})
