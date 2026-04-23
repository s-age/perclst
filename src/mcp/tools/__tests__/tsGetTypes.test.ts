import { vi, describe, it, expect, beforeEach } from 'vitest'
import { executeTsGetTypes } from '../tsGetTypes'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'

vi.mock('@src/core/di/container')
vi.mock('@src/core/di/identifiers')

describe('executeTsGetTypes', () => {
  let mockGetTypeDefinitions: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetTypeDefinitions = vi.fn()

    const mockService = {
      getTypeDefinitions: mockGetTypeDefinitions
    }

    vi.mocked(container).resolve.mockReturnValue(mockService)
  })

  it('returns formatted JSON when type definition is found', async () => {
    const mockDefinition = {
      name: 'myFunction',
      parameters: [{ name: 'arg1', type: 'string' }],
      returnType: 'Promise<void>'
    }

    mockGetTypeDefinitions.mockReturnValue(mockDefinition)

    const result = await executeTsGetTypes({
      file_path: '/path/to/file.ts',
      symbol_name: 'myFunction'
    })

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(mockDefinition, null, 2)
        }
      ]
    })
  })

  it('calls container.resolve with correct token', async () => {
    mockGetTypeDefinitions.mockReturnValue(null)

    await executeTsGetTypes({
      file_path: '/path/to/file.ts',
      symbol_name: 'myFunction'
    })

    expect(vi.mocked(container).resolve).toHaveBeenCalledWith(TOKENS.TsAnalysisService)
  })

  it('calls getTypeDefinitions with file_path and symbol_name', async () => {
    mockGetTypeDefinitions.mockReturnValue(null)

    const filePath = '/absolute/path/to/file.ts'
    const symbolName = 'exportedFunction'

    await executeTsGetTypes({
      file_path: filePath,
      symbol_name: symbolName
    })

    expect(mockGetTypeDefinitions).toHaveBeenCalledWith(filePath, symbolName)
  })

  it('returns not found message when definition is null', async () => {
    mockGetTypeDefinitions.mockReturnValue(null)

    const result = await executeTsGetTypes({
      file_path: '/path/to/file.ts',
      symbol_name: 'nonExistentSymbol'
    })

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'Type definition not found for symbol: nonExistentSymbol'
        }
      ]
    })
  })

  it('returns not found message when definition is undefined', async () => {
    mockGetTypeDefinitions.mockReturnValue(undefined)

    const result = await executeTsGetTypes({
      file_path: '/path/to/file.ts',
      symbol_name: 'unknownSymbol'
    })

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'Type definition not found for symbol: unknownSymbol'
        }
      ]
    })
  })

  it('formats complex nested definition as JSON', async () => {
    const complexDefinition = {
      name: 'complexFunc',
      signature: 'function complexFunc(opts: Options): Result',
      parameters: [
        {
          name: 'opts',
          type: 'Options',
          description: 'Configuration options',
          fields: {
            timeout: { type: 'number', required: true },
            retries: { type: 'number', required: false }
          }
        }
      ],
      returnType: {
        type: 'Result',
        fields: {
          success: 'boolean',
          data: 'unknown',
          error: 'Error | null'
        }
      }
    }

    mockGetTypeDefinitions.mockReturnValue(complexDefinition)

    const result = await executeTsGetTypes({
      file_path: '/path/to/complex.ts',
      symbol_name: 'complexFunc'
    })

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(complexDefinition, null, 2)
        }
      ]
    })
  })
})
