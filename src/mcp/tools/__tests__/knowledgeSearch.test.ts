import { vi, describe, it, expect, beforeEach } from 'vitest'
import { executeKnowledgeSearch } from '../knowledgeSearch.js'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { KnowledgeSearchService } from '@src/services/knowledgeSearchService'

vi.mock('@src/core/di/container')

describe('executeKnowledgeSearch', () => {
  let mockService: Partial<KnowledgeSearchService>

  beforeEach(() => {
    vi.clearAllMocks()
    mockService = {
      search: vi.fn()
    }
    vi.mocked(container.resolve).mockReturnValue(mockService as KnowledgeSearchService)
  })

  it('resolves KnowledgeSearchService from container with TOKENS.KnowledgeSearchService', async () => {
    vi.mocked(mockService.search).mockReturnValue({
      query: 'test',
      results: [],
      total: 0
    })

    await executeKnowledgeSearch({ query: 'test' })

    expect(container.resolve).toHaveBeenCalledWith(TOKENS.KnowledgeSearchService)
  })

  it('calls service.search with query and include_draft=false when include_draft is not provided', async () => {
    vi.mocked(mockService.search).mockReturnValue({
      query: 'test query',
      results: [],
      total: 0
    })

    await executeKnowledgeSearch({ query: 'test query' })

    expect(mockService.search).toHaveBeenCalledWith({
      query: 'test query',
      include_draft: false
    })
  })

  it('calls service.search with include_draft=true when explicitly provided', async () => {
    vi.mocked(mockService.search).mockReturnValue({
      query: 'test query',
      results: [],
      total: 0
    })

    await executeKnowledgeSearch({ query: 'test query', include_draft: true })

    expect(mockService.search).toHaveBeenCalledWith({
      query: 'test query',
      include_draft: true
    })
  })

  it('calls service.search with include_draft=false when explicitly set to false', async () => {
    vi.mocked(mockService.search).mockReturnValue({
      query: 'test query',
      results: [],
      total: 0
    })

    await executeKnowledgeSearch({ query: 'test query', include_draft: false })

    expect(mockService.search).toHaveBeenCalledWith({
      query: 'test query',
      include_draft: false
    })
  })

  it('returns result as JSON string wrapped in MCP content format', async () => {
    const searchResult = {
      query: 'test',
      results: [
        {
          file_path: 'knowledge/example.md',
          title: 'Example',
          excerpt: 'This is an example',
          matched_terms: ['test']
        }
      ],
      total: 1
    }
    vi.mocked(mockService.search).mockReturnValue(searchResult)

    const result = await executeKnowledgeSearch({ query: 'test' })

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(searchResult, null, 2)
        }
      ]
    })
  })

  it('returns empty results when no matches found', async () => {
    vi.mocked(mockService.search).mockReturnValue({
      query: 'nonexistent',
      results: [],
      total: 0
    })

    const result = await executeKnowledgeSearch({ query: 'nonexistent' })

    const expected = {
      query: 'nonexistent',
      results: [],
      total: 0
    }
    expect(result.content[0].text).toBe(JSON.stringify(expected, null, 2))
  })

  it('returns multiple results with proper JSON formatting', async () => {
    const searchResult = {
      query: 'architecture',
      results: [
        {
          file_path: 'knowledge/architecture.md',
          title: 'Architecture Overview',
          excerpt: 'The system architecture consists of...',
          matched_terms: ['architecture']
        },
        {
          file_path: 'knowledge/patterns.md',
          title: 'Design Patterns',
          excerpt: 'Architectural patterns used in...',
          matched_terms: ['architecture']
        }
      ],
      total: 2
    }
    vi.mocked(mockService.search).mockReturnValue(searchResult)

    const result = await executeKnowledgeSearch({ query: 'architecture' })

    expect(result.content[0].text).toBe(JSON.stringify(searchResult, null, 2))
    expect(result.content).toHaveLength(1)
  })

  it('throws error when service.search throws', async () => {
    const error = new Error('Search service failed')
    vi.mocked(mockService.search).mockImplementation(() => {
      throw error
    })

    await expect(executeKnowledgeSearch({ query: 'test' })).rejects.toThrow('Search service failed')
  })

  it('throws error when container.resolve throws', async () => {
    const error = new Error('Failed to resolve service')
    vi.mocked(container.resolve).mockImplementation(() => {
      throw error
    })

    await expect(executeKnowledgeSearch({ query: 'test' })).rejects.toThrow(
      'Failed to resolve service'
    )
  })

  it('returns content with text type constant', async () => {
    vi.mocked(mockService.search).mockReturnValue({
      query: 'test',
      results: [],
      total: 0
    })

    const result = await executeKnowledgeSearch({ query: 'test' })

    expect(result.content[0].type).toBe('text')
    expect(typeof result.content[0].type).toBe('string')
  })

  it('handles query with special characters', async () => {
    const query = 'test & special "quotes" characters'
    vi.mocked(mockService.search).mockReturnValue({
      query,
      results: [],
      total: 0
    })

    await executeKnowledgeSearch({ query })

    expect(mockService.search).toHaveBeenCalledWith({
      query,
      include_draft: false
    })
  })
})
