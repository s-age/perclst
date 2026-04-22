import { vi, describe, it, expect, beforeEach } from 'vitest'
import { TestStrategyDomain } from '../../testStrategy'
import type { ITestStrategyRepository } from '@src/repositories/ports/testStrategy'
import type { RawFunctionInfo, TestStrategyOptions } from '@src/types/testStrategy'

// ============================================================================
// TestStrategyDomain class tests
// ============================================================================

describe('TestStrategyDomain', () => {
  let mockRepo: ITestStrategyRepository
  let domain: TestStrategyDomain

  beforeEach(() => {
    mockRepo = {
      parseFunctions: vi.fn(),
      findTestFile: vi.fn(),
      extractTestFunctions: vi.fn(),
      readPackageDeps: vi.fn(),
      canonicalTestFilePath: vi.fn()
    }

    vi.clearAllMocks()
    domain = new TestStrategyDomain(mockRepo)
  })

  describe('analyze', () => {
    it('returns error when target file is not TypeScript', () => {
      const options: TestStrategyOptions = {
        targetFilePath: 'src/file.js',
        testFilePath: undefined
      }

      const result = domain.analyze(options)

      expect(result.target_file_path).toBe('src/file.js')
      expect(result.error).toContain('Not a TypeScript file')
      expect(result.strategies).toHaveLength(0)
    })

    it('returns error when file not found', () => {
      vi.mocked(mockRepo.parseFunctions).mockReturnValue(null)

      const options: TestStrategyOptions = {
        targetFilePath: 'src/nonexistent.ts',
        testFilePath: undefined
      }

      const result = domain.analyze(options)

      expect(result.error).toContain('File not found')
      expect(result.strategies).toHaveLength(0)
    })

    it('analyzes functions successfully with no existing test file', () => {
      const rawFunctions: RawFunctionInfo[] = [
        {
          name: 'myFunc',
          class_name: null,
          lineno: 10,
          branchCount: 1,
          loopCount: 0,
          logicalOpCount: 0,
          catchCount: 0,
          referencedImports: []
        }
      ]

      vi.mocked(mockRepo.parseFunctions).mockReturnValue(rawFunctions)
      vi.mocked(mockRepo.findTestFile).mockReturnValue(null)
      vi.mocked(mockRepo.readPackageDeps).mockReturnValue(null)
      vi.mocked(mockRepo.canonicalTestFilePath).mockReturnValue('src/__tests__/file.test.ts')

      const options: TestStrategyOptions = {
        targetFilePath: 'src/file.ts',
        testFilePath: undefined
      }

      const result = domain.analyze(options)

      expect(result.target_file_path).toBe('src/file.ts')
      expect(result.corresponding_test_file).toBeNull()
      expect(result.test_file_exists).toBe(false)
      expect(result.strategies).toHaveLength(1)
      expect(result.strategies[0].function_name).toBe('myFunc')
    })

    it('analyzes functions successfully with existing test file', () => {
      const rawFunctions: RawFunctionInfo[] = [
        {
          name: 'myFunc',
          class_name: null,
          lineno: 10,
          branchCount: 0,
          loopCount: 0,
          logicalOpCount: 0,
          catchCount: 0,
          referencedImports: []
        }
      ]

      vi.mocked(mockRepo.parseFunctions).mockReturnValue(rawFunctions)
      vi.mocked(mockRepo.findTestFile).mockReturnValue('src/__tests__/file.test.ts')
      vi.mocked(mockRepo.extractTestFunctions).mockReturnValue(['test_myFunc'])
      vi.mocked(mockRepo.readPackageDeps).mockReturnValue(null)

      const options: TestStrategyOptions = {
        targetFilePath: 'src/file.ts',
        testFilePath: undefined
      }

      const result = domain.analyze(options)

      expect(result.test_file_exists).toBe(true)
      expect(result.corresponding_test_file).toBe('src/__tests__/file.test.ts')
      expect(result.strategies[0].existing_test_function).toBe('test_myFunc')
    })

    it('uses provided testFilePath over findTestFile result', () => {
      const rawFunctions: RawFunctionInfo[] = [
        {
          name: 'myFunc',
          class_name: null,
          lineno: 10,
          branchCount: 0,
          loopCount: 0,
          logicalOpCount: 0,
          catchCount: 0,
          referencedImports: []
        }
      ]

      vi.mocked(mockRepo.parseFunctions).mockReturnValue(rawFunctions)
      vi.mocked(mockRepo.extractTestFunctions).mockReturnValue(['test_myFunc'])
      vi.mocked(mockRepo.readPackageDeps).mockReturnValue(null)

      const options: TestStrategyOptions = {
        targetFilePath: 'src/file.ts',
        testFilePath: 'src/__tests__/custom.test.ts'
      }

      const result = domain.analyze(options)

      expect(result.corresponding_test_file).toBe('src/__tests__/custom.test.ts')
      expect(mockRepo.findTestFile).not.toHaveBeenCalled()
      expect(mockRepo.extractTestFunctions).toHaveBeenCalledWith('src/__tests__/custom.test.ts')
    })
  })

  describe('detectFramework', () => {
    it('detects vitest when present in dependencies', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detectFramework = (domain as any).detectFramework.bind(domain)
      const deps = { vitest: '^4.0.0', jest: '^29.0.0' }

      expect(detectFramework(deps)).toBe('vitest')
    })

    it('defaults to jest when vitest not found', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detectFramework = (domain as any).detectFramework.bind(domain)
      const deps = { jest: '^29.0.0' }

      expect(detectFramework(deps)).toBe('jest')
    })

    it('defaults to jest when deps is null', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detectFramework = (domain as any).detectFramework.bind(domain)

      expect(detectFramework(null)).toBe('jest')
    })
  })

  describe('errResult', () => {
    it('creates error result with provided message', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errResult = (domain as any).errResult.bind(domain)
      const result = errResult('src/file.ts', 'Custom error message')

      expect(result.target_file_path).toBe('src/file.ts')
      expect(result.error).toBe('Custom error message')
      expect(result.corresponding_test_file).toBeNull()
      expect(result.test_file_exists).toBe(false)
      expect(result.expected_test_file_path).toBe('')
      expect(result.strategies).toHaveLength(0)
      expect(result.overall_recommendation).toBe('')
    })
  })
})
