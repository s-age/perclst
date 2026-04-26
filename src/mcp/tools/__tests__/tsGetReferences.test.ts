import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { TsAnalysisService } from '@src/services/tsAnalysisService'
import type { RecursiveReferenceInfo } from '@src/types/tsAnalysis'
import { executeTsGetReferences } from '../tsGetReferences'

// Mock the container and service
const mockGetReferences = vi.fn()
const mockTsAnalysisService = {
  analyze: vi.fn(),
  getReferences: mockGetReferences,
  getTypeDefinitions: vi.fn()
} as unknown as TsAnalysisService

vi.mock('@src/core/di/container', () => ({
  container: {
    resolve: vi.fn(() => mockTsAnalysisService)
  }
}))

vi.mock('@src/core/di/identifiers', () => ({
  TOKENS: {
    TsAnalysisService: 'TsAnalysisService'
  }
}))

describe('executeTsGetReferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('happy path', () => {
    it('should call service.getReferences with file_path and symbol_name', async () => {
      const mockReferences: RecursiveReferenceInfo[] = [
        {
          file_path: '/path/to/caller.ts',
          line: 5,
          column: 10,
          snippet: 'myFunction()'
        }
      ]
      vi.mocked(mockGetReferences).mockReturnValue(mockReferences)

      const result = await executeTsGetReferences({
        file_path: '/path/to/file.ts',
        symbol_name: 'myFunction'
      })

      expect(mockGetReferences).toHaveBeenCalledWith('/path/to/file.ts', 'myFunction', {
        includeTest: undefined,
        recursive: undefined
      })
      expect(result.content).toHaveLength(1)
      expect(result.content[0].type).toBe('text')
    })

    it('should return formatted JSON response with symbol and references', async () => {
      const mockReferences: RecursiveReferenceInfo[] = [
        {
          file_path: '/path/to/caller.ts',
          line: 5,
          column: 10,
          snippet: 'myFunction()'
        }
      ]
      vi.mocked(mockGetReferences).mockReturnValue(mockReferences)

      const result = await executeTsGetReferences({
        file_path: '/path/to/file.ts',
        symbol_name: 'testSymbol'
      })

      const parsedText = JSON.parse(result.content[0].text)
      expect(parsedText).toEqual({
        symbol: 'testSymbol',
        references: mockReferences
      })
    })

    it('should return empty references array when no references found', async () => {
      vi.mocked(mockGetReferences).mockReturnValue([])

      const result = await executeTsGetReferences({
        file_path: '/path/to/file.ts',
        symbol_name: 'unusedFunction'
      })

      const parsedText = JSON.parse(result.content[0].text)
      expect(parsedText.references).toEqual([])
    })

    it('should return multiple references', async () => {
      const mockReferences: RecursiveReferenceInfo[] = [
        {
          file_path: '/path/to/caller1.ts',
          line: 5,
          column: 10,
          snippet: 'myFunction()'
        },
        {
          file_path: '/path/to/caller2.ts',
          line: 12,
          column: 8,
          snippet: 'wrapper()'
        }
      ]
      vi.mocked(mockGetReferences).mockReturnValue(mockReferences)

      const result = await executeTsGetReferences({
        file_path: '/path/to/file.ts',
        symbol_name: 'myFunction'
      })

      const parsedText = JSON.parse(result.content[0].text)
      expect(parsedText.references).toHaveLength(2)
    })

    it('should return references with nested caller structure', async () => {
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
        }
      ]
      vi.mocked(mockGetReferences).mockReturnValue(mockReferences)

      const result = await executeTsGetReferences({
        file_path: '/path/to/file.ts',
        symbol_name: 'myFunction'
      })

      const parsedText = JSON.parse(result.content[0].text)
      expect(parsedText.references[0].caller).toBeDefined()
      expect(parsedText.references[0].caller.symbol_name).toBe('wrapper')
    })
  })

  describe('optional parameters', () => {
    it('should pass include_test option to service when set to true', async () => {
      vi.mocked(mockGetReferences).mockReturnValue([])

      await executeTsGetReferences({
        file_path: '/path/to/file.ts',
        symbol_name: 'myFunction',
        include_test: true
      })

      expect(mockGetReferences).toHaveBeenCalledWith('/path/to/file.ts', 'myFunction', {
        includeTest: true,
        recursive: undefined
      })
    })

    it('should pass include_test option as false to service when set to false', async () => {
      vi.mocked(mockGetReferences).mockReturnValue([])

      await executeTsGetReferences({
        file_path: '/path/to/file.ts',
        symbol_name: 'myFunction',
        include_test: false
      })

      expect(mockGetReferences).toHaveBeenCalledWith('/path/to/file.ts', 'myFunction', {
        includeTest: false,
        recursive: undefined
      })
    })

    it('should pass recursive option to service when set to true', async () => {
      vi.mocked(mockGetReferences).mockReturnValue([])

      await executeTsGetReferences({
        file_path: '/path/to/file.ts',
        symbol_name: 'myFunction',
        recursive: true
      })

      expect(mockGetReferences).toHaveBeenCalledWith('/path/to/file.ts', 'myFunction', {
        includeTest: undefined,
        recursive: true
      })
    })

    it('should pass recursive option as false to service when set to false', async () => {
      vi.mocked(mockGetReferences).mockReturnValue([])

      await executeTsGetReferences({
        file_path: '/path/to/file.ts',
        symbol_name: 'myFunction',
        recursive: false
      })

      expect(mockGetReferences).toHaveBeenCalledWith('/path/to/file.ts', 'myFunction', {
        includeTest: undefined,
        recursive: false
      })
    })

    it('should pass both optional parameters to service', async () => {
      vi.mocked(mockGetReferences).mockReturnValue([])

      await executeTsGetReferences({
        file_path: '/path/to/file.ts',
        symbol_name: 'myFunction',
        include_test: true,
        recursive: false
      })

      expect(mockGetReferences).toHaveBeenCalledWith('/path/to/file.ts', 'myFunction', {
        includeTest: true,
        recursive: false
      })
    })
  })

  describe('error handling', () => {
    it('should throw when service.getReferences throws an error', async () => {
      const error = new Error('Failed to analyze file')
      vi.mocked(mockGetReferences).mockImplementation(() => {
        throw error
      })

      await expect(
        executeTsGetReferences({
          file_path: '/path/to/file.ts',
          symbol_name: 'myFunction'
        })
      ).rejects.toThrow('Failed to analyze file')
    })

    it('should rethrow syntax errors from service', async () => {
      const error = new SyntaxError('Invalid TypeScript syntax')
      vi.mocked(mockGetReferences).mockImplementation(() => {
        throw error
      })

      await expect(
        executeTsGetReferences({
          file_path: '/path/to/invalid.ts',
          symbol_name: 'myFunction'
        })
      ).rejects.toThrow(SyntaxError)
    })
  })

  describe('response format', () => {
    it('should always return content array with single text item', async () => {
      vi.mocked(mockGetReferences).mockReturnValue([])

      const result = await executeTsGetReferences({
        file_path: '/path/to/file.ts',
        symbol_name: 'myFunction'
      })

      expect(result).toHaveProperty('content')
      expect(Array.isArray(result.content)).toBe(true)
      expect(result.content).toHaveLength(1)
      expect(result.content[0]).toHaveProperty('type', 'text')
      expect(result.content[0]).toHaveProperty('text')
    })

    it('should return valid JSON in text field', async () => {
      const mockReferences: RecursiveReferenceInfo[] = [
        {
          file_path: '/path/to/caller.ts',
          line: 5,
          column: 10,
          snippet: 'myFunction()'
        }
      ]
      vi.mocked(mockGetReferences).mockReturnValue(mockReferences)

      const result = await executeTsGetReferences({
        file_path: '/path/to/file.ts',
        symbol_name: 'myFunction'
      })

      // Should not throw when parsing
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed).toBeDefined()
    })

    it('should format JSON with 2-space indentation', async () => {
      vi.mocked(mockGetReferences).mockReturnValue([])

      const result = await executeTsGetReferences({
        file_path: '/path/to/file.ts',
        symbol_name: 'myFunction'
      })

      // Check that the JSON is formatted with indentation
      expect(result.content[0].text).toContain('\n')
      expect(result.content[0].text).toMatch(/{\n\s{2}"symbol"/)
    })
  })

  describe('edge cases', () => {
    it('should handle symbol names with special characters', async () => {
      vi.mocked(mockGetReferences).mockReturnValue([])

      await executeTsGetReferences({
        file_path: '/path/to/file.ts',
        symbol_name: '__proto__'
      })

      expect(mockGetReferences).toHaveBeenCalledWith('/path/to/file.ts', '__proto__', {
        includeTest: undefined,
        recursive: undefined
      })
    })

    it('should handle file paths with special characters', async () => {
      vi.mocked(mockGetReferences).mockReturnValue([])

      await executeTsGetReferences({
        file_path: '/path/with spaces/and-dashes/file.ts',
        symbol_name: 'myFunction'
      })

      expect(mockGetReferences).toHaveBeenCalledWith(
        '/path/with spaces/and-dashes/file.ts',
        'myFunction',
        {
          includeTest: undefined,
          recursive: undefined
        }
      )
    })

    it('should handle references with very long snippet strings', async () => {
      const longSnippet = 'a'.repeat(1000)
      const mockReferences: RecursiveReferenceInfo[] = [
        {
          file_path: '/path/to/caller.ts',
          line: 5,
          column: 10,
          snippet: longSnippet
        }
      ]
      vi.mocked(mockGetReferences).mockReturnValue(mockReferences)

      const result = await executeTsGetReferences({
        file_path: '/path/to/file.ts',
        symbol_name: 'myFunction'
      })

      const parsedText = JSON.parse(result.content[0].text)
      expect(parsedText.references[0].snippet).toBe(longSnippet)
    })

    it('should preserve reference metadata (file_path, line, column, snippet)', async () => {
      const mockReferences: RecursiveReferenceInfo[] = [
        {
          file_path: '/path/to/specific/caller.ts',
          line: 42,
          column: 15,
          snippet: 'specificContext()'
        }
      ]
      vi.mocked(mockGetReferences).mockReturnValue(mockReferences)

      const result = await executeTsGetReferences({
        file_path: '/path/to/file.ts',
        symbol_name: 'myFunction'
      })

      const parsedText = JSON.parse(result.content[0].text)
      const ref = parsedText.references[0]
      expect(ref.file_path).toBe('/path/to/specific/caller.ts')
      expect(ref.line).toBe(42)
      expect(ref.column).toBe(15)
      expect(ref.snippet).toBe('specificContext()')
    })
  })
})
