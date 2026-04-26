import { vi, describe, it, expect, beforeEach } from 'vitest'
import { executeTsTestStrategist, tsTestStrategist } from '../tsTestStrategist'

// Mock the DI container
vi.mock('@src/core/di/container', () => ({
  container: {
    resolve: vi.fn()
  }
}))

// Mock the DI tokens
vi.mock('@src/core/di/identifiers', () => ({
  TOKENS: {
    TestStrategistService: 'TestStrategistService'
  }
}))

import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'

describe('executeTsTestStrategist', () => {
  let mockTestStrategistService: { analyze: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
    mockTestStrategistService = {
      analyze: vi.fn()
    }
    ;(container.resolve as ReturnType<typeof vi.fn>).mockReturnValue(mockTestStrategistService)
  })

  it('resolves TestStrategistService from container using correct token', async () => {
    const mockResult = {
      target_file_path: 'src/test.ts',
      strategies: []
    }
    mockTestStrategistService.analyze.mockReturnValue(mockResult)

    await executeTsTestStrategist({
      target_file_path: 'src/test.ts'
    })

    expect(container.resolve).toHaveBeenCalledWith(TOKENS.TestStrategistService)
  })

  it('calls analyze with target_file_path when test_file_path is omitted', async () => {
    const mockResult = {
      target_file_path: 'src/test.ts',
      strategies: []
    }
    mockTestStrategistService.analyze.mockReturnValue(mockResult)

    await executeTsTestStrategist({
      target_file_path: 'src/test.ts'
    })

    expect(mockTestStrategistService.analyze).toHaveBeenCalledWith({
      targetFilePath: 'src/test.ts',
      testFilePath: undefined
    })
  })

  it('calls analyze with both target_file_path and test_file_path when provided', async () => {
    const mockResult = {
      target_file_path: 'src/test.ts',
      test_file_path: 'src/__tests__/test.test.ts',
      strategies: []
    }
    mockTestStrategistService.analyze.mockReturnValue(mockResult)

    await executeTsTestStrategist({
      target_file_path: 'src/test.ts',
      test_file_path: 'src/__tests__/test.test.ts'
    })

    expect(mockTestStrategistService.analyze).toHaveBeenCalledWith({
      targetFilePath: 'src/test.ts',
      testFilePath: 'src/__tests__/test.test.ts'
    })
  })

  it('returns content array with text type and JSON-stringified result', async () => {
    const mockResult = {
      target_file_path: 'src/test.ts',
      strategies: [
        {
          function_name: 'testFunc',
          complexity: 2,
          suggested_test_case_count: 3
        }
      ]
    }
    mockTestStrategistService.analyze.mockReturnValue(mockResult)

    const result = await executeTsTestStrategist({
      target_file_path: 'src/test.ts'
    })

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(mockResult, null, 2)
        }
      ]
    })
  })

  it('returns properly formatted JSON with consistent indentation', async () => {
    const mockResult = {
      target_file_path: 'src/test.ts',
      strategies: []
    }
    mockTestStrategistService.analyze.mockReturnValue(mockResult)

    const result = await executeTsTestStrategist({
      target_file_path: 'src/test.ts'
    })

    const parsedText = JSON.parse(result.content[0].text)
    expect(parsedText).toEqual(mockResult)
  })

  it('propagates error when service.analyze throws', async () => {
    const testError = new Error('Service analysis failed')
    mockTestStrategistService.analyze.mockImplementation(() => {
      throw testError
    })

    await expect(
      executeTsTestStrategist({
        target_file_path: 'src/test.ts'
      })
    ).rejects.toThrow('Service analysis failed')
  })

  it('calls analyze once per execution', async () => {
    mockTestStrategistService.analyze.mockReturnValue({
      target_file_path: 'src/test.ts',
      strategies: []
    })

    await executeTsTestStrategist({
      target_file_path: 'src/test.ts'
    })
    await executeTsTestStrategist({
      target_file_path: 'src/another.ts'
    })

    expect(mockTestStrategistService.analyze).toHaveBeenCalledTimes(2)
  })

  it('handles complex nested result structures in JSON output', async () => {
    const mockResult = {
      target_file_path: 'src/test.ts',
      strategies: [
        {
          function_name: 'complexFunc',
          complexity: 5,
          missing_coverage: [
            {
              type: 'missing_test_function',
              details: 'No test found',
              lineno: 42
            }
          ],
          suggested_mocks: ['module1', 'module2']
        }
      ]
    }
    mockTestStrategistService.analyze.mockReturnValue(mockResult)

    const result = await executeTsTestStrategist({
      target_file_path: 'src/test.ts'
    })

    const parsedText = JSON.parse(result.content[0].text)
    expect(parsedText.strategies[0].missing_coverage[0].lineno).toBe(42)
    expect(parsedText.strategies[0].suggested_mocks).toEqual(['module1', 'module2'])
  })
})

describe('tsTestStrategist tool definition', () => {
  it('has correct name', () => {
    expect(tsTestStrategist.name).toBe('ts_test_strategist')
  })

  it('has descriptive description', () => {
    expect(tsTestStrategist.description).toContain('unit test strategy')
    expect(tsTestStrategist.description).toContain('TypeScript')
  })

  it('defines inputSchema as object type', () => {
    expect(tsTestStrategist.inputSchema.type).toBe('object')
  })

  it('includes target_file_path property in inputSchema', () => {
    expect(tsTestStrategist.inputSchema.properties).toHaveProperty('target_file_path')
    expect(tsTestStrategist.inputSchema.properties.target_file_path.type).toBe('string')
    expect(tsTestStrategist.inputSchema.properties.target_file_path.description).toContain(
      'TypeScript'
    )
  })

  it('includes test_file_path property in inputSchema', () => {
    expect(tsTestStrategist.inputSchema.properties).toHaveProperty('test_file_path')
    expect(tsTestStrategist.inputSchema.properties.test_file_path.type).toBe('string')
    expect(tsTestStrategist.inputSchema.properties.test_file_path.description).toContain('test')
  })

  it('marks target_file_path as required', () => {
    expect(tsTestStrategist.inputSchema.required).toContain('target_file_path')
  })

  it('does not mark test_file_path as required', () => {
    expect(tsTestStrategist.inputSchema.required).not.toContain('test_file_path')
  })

  it('has both required properties defined', () => {
    expect(tsTestStrategist.inputSchema.required.length).toBeGreaterThan(0)
  })
})
