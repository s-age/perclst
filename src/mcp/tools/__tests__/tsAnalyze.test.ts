import { vi, describe, it, expect, beforeEach } from 'vitest'
import { executeTsAnalyze } from '../tsAnalyze'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { TsAnalysisService } from '@src/services/tsAnalysisService'
import type { TypeScriptAnalysis } from '@src/types/tsAnalysis'

vi.mock('@src/core/di/container')
vi.mock('@src/core/di/identifiers')

describe('executeTsAnalyze', () => {
  let mockTsAnalysisService: { analyze: ReturnType<typeof vi.fn> }
  let mockAnalysis: TypeScriptAnalysis

  beforeEach(() => {
    vi.clearAllMocks()

    mockAnalysis = {
      file_path: '/path/to/file.ts',
      symbols: [
        {
          name: 'myFunction',
          kind: 'function',
          line: 1,
          type: '() => void'
        }
      ],
      imports: [
        {
          source: 'some-module',
          imported: ['Something']
        }
      ],
      exports: [
        {
          name: 'myFunction',
          kind: 'function'
        }
      ]
    }

    mockTsAnalysisService = {
      analyze: vi.fn().mockReturnValue(mockAnalysis)
    }

    vi.mocked(container).resolve.mockReturnValue(
      mockTsAnalysisService as unknown as TsAnalysisService
    )
  })

  it('resolves TsAnalysisService from container with correct token', async () => {
    await executeTsAnalyze({ file_path: '/path/to/file.ts' })

    expect(container.resolve).toHaveBeenCalledWith(TOKENS.TsAnalysisService)
    expect(container.resolve).toHaveBeenCalledTimes(1)
  })

  it('calls service.analyze with the provided file path', async () => {
    const filePath = '/path/to/file.ts'

    await executeTsAnalyze({ file_path: filePath })

    expect(mockTsAnalysisService.analyze).toHaveBeenCalledWith(filePath)
    expect(mockTsAnalysisService.analyze).toHaveBeenCalledTimes(1)
  })

  it('returns result wrapped in content array with text type', async () => {
    const result = await executeTsAnalyze({ file_path: '/path/to/file.ts' })

    expect(result).toHaveProperty('content')
    expect(Array.isArray(result.content)).toBe(true)
    expect(result.content.length).toBe(1)
    expect(result.content[0]).toHaveProperty('type', 'text')
    expect(result.content[0]).toHaveProperty('text')
  })

  it('returns analysis result as JSON string in content text', async () => {
    const result = await executeTsAnalyze({ file_path: '/path/to/file.ts' })

    const parsedText = JSON.parse(result.content[0].text)
    expect(parsedText).toEqual(mockAnalysis)
  })

  it('handles analysis with multiple symbols', async () => {
    const analysisWithMultipleSymbols: TypeScriptAnalysis = {
      file_path: '/path/to/file.ts',
      symbols: [
        { name: 'func1', kind: 'function', line: 1, type: '() => void' },
        { name: 'func2', kind: 'function', line: 5, type: '() => string' },
        { name: 'Type1', kind: 'type', line: 10, type: 'type' }
      ],
      imports: [
        { source: 'module1', imported: ['A', 'B'] },
        { source: 'module2', imported: ['C'] }
      ],
      exports: [
        { name: 'func1', kind: 'function' },
        { name: 'func2', kind: 'function' },
        { name: 'Type1', kind: 'type' }
      ]
    }

    mockTsAnalysisService.analyze.mockReturnValue(analysisWithMultipleSymbols)

    const result = await executeTsAnalyze({ file_path: '/path/to/file.ts' })
    const parsedText = JSON.parse(result.content[0].text)

    expect(parsedText.symbols.length).toBe(3)
    expect(parsedText.imports.length).toBe(2)
    expect(parsedText.exports.length).toBe(3)
  })

  it('handles analysis with no symbols', async () => {
    const analysisWithNoSymbols: TypeScriptAnalysis = {
      file_path: '/path/to/empty.ts',
      symbols: [],
      imports: [],
      exports: []
    }

    mockTsAnalysisService.analyze.mockReturnValue(analysisWithNoSymbols)

    const result = await executeTsAnalyze({ file_path: '/path/to/empty.ts' })
    const parsedText = JSON.parse(result.content[0].text)

    expect(parsedText.symbols).toHaveLength(0)
    expect(parsedText.imports).toHaveLength(0)
    expect(parsedText.exports).toHaveLength(0)
  })

  it('preserves file path in returned analysis', async () => {
    const filePath = '/custom/path/to/module.ts'
    mockTsAnalysisService.analyze.mockReturnValue({
      file_path: filePath,
      symbols: [],
      imports: [],
      exports: []
    })

    const result = await executeTsAnalyze({ file_path: filePath })
    const parsedText = JSON.parse(result.content[0].text)

    expect(parsedText.file_path).toBe(filePath)
  })

  it('formats returned JSON with proper indentation', async () => {
    const result = await executeTsAnalyze({ file_path: '/path/to/file.ts' })

    // Verify that the JSON is formatted (contains newlines and indentation)
    expect(result.content[0].text).toContain('\n')
    expect(result.content[0].text).toContain('  ')
  })
})
