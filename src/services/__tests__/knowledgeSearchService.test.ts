import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { IKnowledgeSearchDomain } from '@src/domains/ports/knowledgeSearch'
import type { KnowledgeSearchResult } from '@src/types/knowledgeSearch'
import { KnowledgeSearchService } from '../knowledgeSearchService'

describe('KnowledgeSearchService', () => {
  let mockDomain: IKnowledgeSearchDomain
  let service: KnowledgeSearchService

  beforeEach(() => {
    mockDomain = {
      hasDraftEntries: vi.fn(),
      search: vi.fn()
    }
    service = new KnowledgeSearchService(mockDomain)
  })

  describe('hasDraftEntries', () => {
    it('returns true when domain has draft entries', () => {
      vi.mocked(mockDomain.hasDraftEntries).mockReturnValue(true)

      const result = service.hasDraftEntries()

      expect(result).toBe(true)
      expect(mockDomain.hasDraftEntries).toHaveBeenCalledOnce()
    })

    it('returns false when domain has no draft entries', () => {
      vi.mocked(mockDomain.hasDraftEntries).mockReturnValue(false)

      const result = service.hasDraftEntries()

      expect(result).toBe(false)
      expect(mockDomain.hasDraftEntries).toHaveBeenCalledOnce()
    })
  })

  describe('search', () => {
    it('returns search results matching query', () => {
      const options = { query: 'fork session' }
      const mockResult: KnowledgeSearchResult = {
        matches: [
          {
            file: 'knowledge/fork-session.md',
            keywords: ['fork', 'session'],
            preview: 'Forking allows...'
          }
        ]
      }
      vi.mocked(mockDomain.search).mockReturnValue(mockResult)

      const result = service.search(options)

      expect(result).toEqual(mockResult)
      expect(mockDomain.search).toHaveBeenCalledWith(options)
      expect(mockDomain.search).toHaveBeenCalledOnce()
    })

    it('returns empty results when no matches found', () => {
      const options = { query: 'nonexistent-term-xyz' }
      const mockResult: KnowledgeSearchResult = { matches: [] }
      vi.mocked(mockDomain.search).mockReturnValue(mockResult)

      const result = service.search(options)

      expect(result).toEqual(mockResult)
      expect(result.matches).toHaveLength(0)
      expect(mockDomain.search).toHaveBeenCalledWith(options)
    })

    it('passes search options unchanged to domain', () => {
      const options = { query: 'test OR validation', include_draft: true }
      const mockResult: KnowledgeSearchResult = { matches: [] }
      vi.mocked(mockDomain.search).mockReturnValue(mockResult)

      service.search(options)

      expect(mockDomain.search).toHaveBeenCalledWith(options)
    })

    it('returns multiple matches when available', () => {
      const options = { query: 'zod' }
      const mockResult: KnowledgeSearchResult = {
        matches: [
          {
            file: 'knowledge/zod-patterns.md',
            keywords: ['zod', 'validation'],
            preview: 'Zod is...'
          },
          {
            file: 'knowledge/validators.md',
            keywords: ['zod', 'schema'],
            preview: 'Validator patterns...'
          }
        ]
      }
      vi.mocked(mockDomain.search).mockReturnValue(mockResult)

      const result = service.search(options)

      expect(result.matches).toHaveLength(2)
      expect(result).toEqual(mockResult)
      expect(mockDomain.search).toHaveBeenCalledWith(options)
    })
  })
})
