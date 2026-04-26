import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { ITsAnalysisDomain } from '@src/domains/ports/tsAnalysis'
import type {
  TypeScriptAnalysis,
  ReferenceInfo,
  RecursiveReferenceInfo,
  TypeDefinition
} from '@src/types/tsAnalysis'
import { TsAnalysisService } from '../tsAnalysisService'

describe('TsAnalysisService', () => {
  let mockDomain: ITsAnalysisDomain
  let service: TsAnalysisService

  beforeEach(() => {
    mockDomain = {
      analyze: vi.fn(),
      getReferences: vi.fn(),
      getReferencesRecursive: vi.fn(),
      getTypeDefinitions: vi.fn()
    }
    service = new TsAnalysisService(mockDomain)
    vi.clearAllMocks()
  })

  describe('analyze', () => {
    it('should call domain.analyze with filePath and return result', () => {
      const filePath = '/path/to/file.ts'
      const mockAnalysis: TypeScriptAnalysis = {
        file_path: filePath,
        symbols: [],
        imports: [],
        exports: []
      }
      vi.mocked(mockDomain.analyze).mockReturnValue(mockAnalysis)

      const result = service.analyze(filePath)

      expect(mockDomain.analyze).toHaveBeenCalledWith(filePath)
      expect(mockDomain.analyze).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockAnalysis)
    })

    it('should return analysis with symbols', () => {
      const filePath = '/path/to/service.ts'
      const mockAnalysis: TypeScriptAnalysis = {
        file_path: filePath,
        symbols: [
          {
            name: 'MyService',
            kind: 'class',
            line: 10,
            constructorParams: [],
            methods: []
          }
        ],
        imports: [
          {
            source: '@src/types',
            imported: ['MyType']
          }
        ],
        exports: [
          {
            name: 'MyService',
            kind: 'class'
          }
        ]
      }
      vi.mocked(mockDomain.analyze).mockReturnValue(mockAnalysis)

      const result = service.analyze(filePath)

      expect(result.symbols).toHaveLength(1)
      expect(result.symbols![0].name).toBe('MyService')
      expect(result.imports).toHaveLength(1)
      expect(result.exports).toHaveLength(1)
    })
  })

  describe('getReferences', () => {
    it('should call getReferencesRecursive when recursive is not explicitly false', () => {
      const filePath = '/path/to/file.ts'
      const symbolName = 'MyFunction'
      const mockReferences: RecursiveReferenceInfo[] = [
        {
          file_path: '/path/to/caller.ts',
          line: 5,
          column: 10,
          snippet: 'myFunction()'
        }
      ]
      vi.mocked(mockDomain.getReferencesRecursive).mockReturnValue(mockReferences)

      const result = service.getReferences(filePath, symbolName, {})

      expect(mockDomain.getReferencesRecursive).toHaveBeenCalledWith(filePath, symbolName, {})
      expect(mockDomain.getReferencesRecursive).toHaveBeenCalledTimes(1)
      expect(mockDomain.getReferences).not.toHaveBeenCalled()
      expect(result).toEqual(mockReferences)
    })

    it('should call getReferencesRecursive when recursive is undefined (default)', () => {
      const filePath = '/path/to/file.ts'
      const symbolName = 'MyFunction'
      const mockReferences: RecursiveReferenceInfo[] = []
      vi.mocked(mockDomain.getReferencesRecursive).mockReturnValue(mockReferences)

      const result = service.getReferences(filePath, symbolName)

      expect(mockDomain.getReferencesRecursive).toHaveBeenCalledWith(
        filePath,
        symbolName,
        undefined
      )
      expect(mockDomain.getReferences).not.toHaveBeenCalled()
      expect(result).toEqual(mockReferences)
    })

    it('should call getReferencesRecursive when recursive is true', () => {
      const filePath = '/path/to/file.ts'
      const symbolName = 'MyFunction'
      const options = { recursive: true as const, includeTest: true }
      const mockReferences: RecursiveReferenceInfo[] = [
        {
          file_path: '/path/to/caller.ts',
          line: 5,
          column: 10,
          snippet: 'myFunction()'
        }
      ]
      vi.mocked(mockDomain.getReferencesRecursive).mockReturnValue(mockReferences)

      const result = service.getReferences(filePath, symbolName, options)

      expect(mockDomain.getReferencesRecursive).toHaveBeenCalledWith(filePath, symbolName, options)
      expect(mockDomain.getReferences).not.toHaveBeenCalled()
      expect(result).toEqual(mockReferences)
    })

    it('should call getReferences when recursive is explicitly false', () => {
      const filePath = '/path/to/file.ts'
      const symbolName = 'MyFunction'
      const options = { recursive: false as const }
      const mockReferences: ReferenceInfo[] = [
        {
          file_path: '/path/to/caller.ts',
          line: 5,
          column: 10,
          snippet: 'myFunction()'
        }
      ]
      vi.mocked(mockDomain.getReferences).mockReturnValue(mockReferences)

      const result = service.getReferences(filePath, symbolName, options)

      expect(mockDomain.getReferences).toHaveBeenCalledWith(filePath, symbolName, options)
      expect(mockDomain.getReferencesRecursive).not.toHaveBeenCalled()
      expect(result).toEqual(mockReferences)
    })

    it('should pass includeTest option to getReferencesRecursive', () => {
      const filePath = '/path/to/file.ts'
      const symbolName = 'MyFunction'
      const options = { includeTest: true }
      vi.mocked(mockDomain.getReferencesRecursive).mockReturnValue([])

      service.getReferences(filePath, symbolName, options)

      expect(mockDomain.getReferencesRecursive).toHaveBeenCalledWith(filePath, symbolName, {
        includeTest: true
      })
    })

    it('should pass includeTest option to getReferences when recursive is false', () => {
      const filePath = '/path/to/file.ts'
      const symbolName = 'MyFunction'
      const options = { recursive: false as const, includeTest: true }
      vi.mocked(mockDomain.getReferences).mockReturnValue([])

      service.getReferences(filePath, symbolName, options)

      expect(mockDomain.getReferences).toHaveBeenCalledWith(filePath, symbolName, options)
    })

    it('should return empty array when no references found with recursive mode', () => {
      const filePath = '/path/to/file.ts'
      const symbolName = 'UnusedFunction'
      vi.mocked(mockDomain.getReferencesRecursive).mockReturnValue([])

      const result = service.getReferences(filePath, symbolName)

      expect(result).toEqual([])
    })

    it('should return empty array when no references found with non-recursive mode', () => {
      const filePath = '/path/to/file.ts'
      const symbolName = 'UnusedFunction'
      vi.mocked(mockDomain.getReferences).mockReturnValue([])

      const result = service.getReferences(filePath, symbolName, { recursive: false as const })

      expect(result).toEqual([])
    })

    it('should return multiple references in recursive mode', () => {
      const filePath = '/path/to/file.ts'
      const symbolName = 'MyFunction'
      const mockReferences: RecursiveReferenceInfo[] = [
        {
          file_path: '/path/to/caller1.ts',
          line: 5,
          column: 10,
          snippet: 'myFunction()',
          caller: {
            symbol_name: 'wrapper',
            file_path: '/path/to/caller2.ts',
            line: 15,
            references: []
          }
        },
        {
          file_path: '/path/to/caller3.ts',
          line: 20,
          column: 12,
          snippet: 'myFunction()'
        }
      ]
      vi.mocked(mockDomain.getReferencesRecursive).mockReturnValue(mockReferences)

      const result = service.getReferences(filePath, symbolName)

      expect(result).toHaveLength(2)
      expect((result as RecursiveReferenceInfo[])[0].caller).toBeDefined()
      expect((result as RecursiveReferenceInfo[])[1].caller).toBeUndefined()
    })
  })

  describe('getTypeDefinitions', () => {
    it('should call domain.getTypeDefinitions with filePath and symbolName and return result', () => {
      const filePath = '/path/to/file.ts'
      const symbolName = 'MyType'
      const mockDefinition: TypeDefinition = {
        name: 'MyType',
        type: 'interface MyType { prop: string }',
        parameters: [],
        returnType: undefined
      }
      vi.mocked(mockDomain.getTypeDefinitions).mockReturnValue(mockDefinition)

      const result = service.getTypeDefinitions(filePath, symbolName)

      expect(mockDomain.getTypeDefinitions).toHaveBeenCalledWith(filePath, symbolName)
      expect(mockDomain.getTypeDefinitions).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockDefinition)
    })

    it('should return null when type definition not found', () => {
      const filePath = '/path/to/file.ts'
      const symbolName = 'NonExistentType'
      vi.mocked(mockDomain.getTypeDefinitions).mockReturnValue(null)

      const result = service.getTypeDefinitions(filePath, symbolName)

      expect(mockDomain.getTypeDefinitions).toHaveBeenCalledWith(filePath, symbolName)
      expect(result).toBeNull()
    })

    it('should return function type definition with parameters', () => {
      const filePath = '/path/to/file.ts'
      const symbolName = 'myFunction'
      const mockDefinition: TypeDefinition = {
        name: 'myFunction',
        type: 'function myFunction(x: string, y: number): boolean',
        parameters: [
          { name: 'x', type: 'string' },
          { name: 'y', type: 'number' }
        ],
        returnType: 'boolean'
      }
      vi.mocked(mockDomain.getTypeDefinitions).mockReturnValue(mockDefinition)

      const result = service.getTypeDefinitions(filePath, symbolName)

      expect(result?.parameters).toHaveLength(2)
      expect(result?.returnType).toBe('boolean')
    })

    it('should return class type definition', () => {
      const filePath = '/path/to/file.ts'
      const symbolName = 'MyClass'
      const mockDefinition: TypeDefinition = {
        name: 'MyClass',
        type: 'class MyClass { ... }',
        parameters: [],
        returnType: undefined
      }
      vi.mocked(mockDomain.getTypeDefinitions).mockReturnValue(mockDefinition)

      const result = service.getTypeDefinitions(filePath, symbolName)

      expect(result?.type).toBe('class MyClass { ... }')
    })
  })
})
