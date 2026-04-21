import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ITestStrategyDomain } from '@src/domains/ports/testStrategy'
import type { TestStrategyOptions, TestStrategyResult } from '@src/types/testStrategy'
import { TestStrategistService } from '../testStrategistService'

describe('TestStrategistService', () => {
  let mockDomain: ITestStrategyDomain
  let service: TestStrategistService

  beforeEach(() => {
    mockDomain = {
      analyze: vi.fn()
    }
    service = new TestStrategistService(mockDomain)
  })

  describe('analyze', () => {
    it('should delegate to domain.analyze with options', () => {
      const options: TestStrategyOptions = {
        targetFilePath: '/path/to/file.ts'
      }

      service.analyze(options)

      expect(mockDomain.analyze).toHaveBeenCalledWith(options)
      expect(mockDomain.analyze).toHaveBeenCalledOnce()
    })

    it('should return result from domain.analyze', () => {
      const options: TestStrategyOptions = {
        targetFilePath: '/path/to/file.ts'
      }
      const mockResult: TestStrategyResult = {
        target_file_path: '/path/to/file.ts',
        corresponding_test_file: '/path/to/file.test.ts',
        test_file_exists: true,
        expected_test_file_path: '/path/to/__tests__/file.test.ts',
        strategies: [],
        overall_recommendation: 'All functions have tests'
      }
      vi.mocked(mockDomain.analyze).mockReturnValue(mockResult)

      const result = service.analyze(options)

      expect(result).toBe(mockResult)
    })

    it('should pass options with testFilePath to domain.analyze', () => {
      const options: TestStrategyOptions = {
        targetFilePath: '/path/to/file.ts',
        testFilePath: '/path/to/file.test.ts'
      }

      service.analyze(options)

      expect(mockDomain.analyze).toHaveBeenCalledWith(options)
    })

    it('should return result with error when domain returns error', () => {
      const options: TestStrategyOptions = {
        targetFilePath: '/invalid/path.ts'
      }
      const mockResult: TestStrategyResult = {
        target_file_path: '/invalid/path.ts',
        corresponding_test_file: null,
        test_file_exists: false,
        expected_test_file_path: '/invalid/__tests__/path.test.ts',
        strategies: [],
        overall_recommendation: 'Error analyzing file',
        error: 'File not found'
      }
      vi.mocked(mockDomain.analyze).mockReturnValue(mockResult)

      const result = service.analyze(options)

      expect(result.error).toBe('File not found')
      expect(result).toBe(mockResult)
    })

    it('should return result with strategies when domain finds functions to test', () => {
      const options: TestStrategyOptions = {
        targetFilePath: '/path/to/file.ts'
      }
      const mockResult: TestStrategyResult = {
        target_file_path: '/path/to/file.ts',
        corresponding_test_file: null,
        test_file_exists: false,
        expected_test_file_path: '/path/to/__tests__/file.test.ts',
        strategies: [
          {
            function_name: 'myFunction',
            class_name: undefined,
            recommended_framework: 'vitest',
            existing_test_function: null,
            complexity: 2,
            suggested_test_case_count: 3,
            missing_coverage: [
              {
                type: 'missing_test_function',
                details: 'No test found for function myFunction'
              }
            ],
            suggested_mocks: [],
            is_custom_hook: false,
            is_component: false
          }
        ],
        overall_recommendation: '1 function(s) are missing unit tests'
      }
      vi.mocked(mockDomain.analyze).mockReturnValue(mockResult)

      const result = service.analyze(options)

      expect(result.strategies).toHaveLength(1)
      expect(result.strategies[0]?.function_name).toBe('myFunction')
      expect(result.overall_recommendation).toContain('missing unit tests')
    })
  })
})
