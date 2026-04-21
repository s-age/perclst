import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { IKnowledgeSearchRepository } from '@src/repositories/ports/knowledgeSearch'
import type { KnowledgeFileEntry } from '@src/types/knowledgeSearch'
import { KnowledgeSearchDomain } from '../knowledgeSearch'

describe('KnowledgeSearchDomain', () => {
  let mockRepo: ReturnType<typeof vi.fn<(include_draft: boolean) => KnowledgeFileEntry[], void>>
  let mockHasDraftEntries: ReturnType<typeof vi.fn<() => boolean, void>>
  let repo: IKnowledgeSearchRepository
  let domain: KnowledgeSearchDomain

  beforeEach(() => {
    mockHasDraftEntries = vi.fn(() => false)
    mockRepo = vi.fn(() => [])
    repo = {
      hasDraftEntries: mockHasDraftEntries,
      loadAll: mockRepo
    }
    domain = new KnowledgeSearchDomain(repo)
    vi.clearAllMocks()
  })

  describe('hasDraftEntries', () => {
    it('should return true when repo has draft entries', () => {
      mockHasDraftEntries.mockReturnValue(true)
      const result = domain.hasDraftEntries()
      expect(result).toBe(true)
    })

    it('should return false when repo has no draft entries', () => {
      mockHasDraftEntries.mockReturnValue(false)
      const result = domain.hasDraftEntries()
      expect(result).toBe(false)
    })

    it('should call repo.hasDraftEntries', () => {
      domain.hasDraftEntries()
      expect(mockHasDraftEntries).toHaveBeenCalledTimes(1)
    })
  })

  describe('search', () => {
    it('should return empty results when query is empty string', () => {
      mockRepo.mockReturnValue([])
      const result = domain.search({ query: '', include_draft: false })
      expect(result.results).toEqual([])
      expect(result.total).toBe(0)
    })

    it('should return empty results when query contains only whitespace', () => {
      mockRepo.mockReturnValue([])
      const result = domain.search({ query: '   ', include_draft: false })
      expect(result.results).toEqual([])
      expect(result.total).toBe(0)
    })

    it('should return empty results when query contains only AND/OR keywords', () => {
      mockRepo.mockReturnValue([])
      const result = domain.search({ query: 'AND OR', include_draft: false })
      expect(result.results).toEqual([])
      expect(result.total).toBe(0)
    })

    it('should match files by keywords field when present', () => {
      const fileWithKeywords: KnowledgeFileEntry = {
        relativePath: 'test/file.md',
        content: '# Test File\n\n**Keywords:** fork, session'
      }
      mockRepo.mockReturnValue([fileWithKeywords])
      const result = domain.search({ query: 'fork', include_draft: false })
      expect(result.results).toHaveLength(1)
      expect(result.results[0].matched_terms).toEqual(['fork'])
      expect(result.results[0].file_path).toBe('test/file.md')
    })

    it('should match files by full content when no keywords field', () => {
      const fileWithoutKeywords: KnowledgeFileEntry = {
        relativePath: 'test/file.md',
        content: '# Test File\n\nThis file discusses fork behavior.'
      }
      mockRepo.mockReturnValue([fileWithoutKeywords])
      const result = domain.search({ query: 'fork', include_draft: false })
      expect(result.results).toHaveLength(1)
      expect(result.results[0].matched_terms).toEqual(['fork'])
    })

    it('should respect AND logic within query terms', () => {
      const file: KnowledgeFileEntry = {
        relativePath: 'test/file.md',
        content: '**Keywords:** fork, session'
      }
      mockRepo.mockReturnValue([file])
      const result = domain.search({ query: 'fork session', include_draft: false })
      expect(result.results).toHaveLength(1)
      expect(result.results[0].matched_terms).toEqual(['fork', 'session'])
    })

    it('should respect OR logic in query', () => {
      const file: KnowledgeFileEntry = {
        relativePath: 'test/file.md',
        content: '**Keywords:** fork'
      }
      mockRepo.mockReturnValue([file])
      const result = domain.search({ query: 'fork OR session', include_draft: false })
      expect(result.results).toHaveLength(1)
      expect(result.results[0].matched_terms).toEqual(['fork'])
    })

    it('should use first matching OR group only', () => {
      const file: KnowledgeFileEntry = {
        relativePath: 'test/file.md',
        content: '**Keywords:** fork, session'
      }
      mockRepo.mockReturnValue([file])
      const result = domain.search({ query: 'fork OR session', include_draft: false })
      expect(result.results[0].matched_terms).toEqual(['fork'])
    })

    it('should exclude non-matching files', () => {
      const matchingFile: KnowledgeFileEntry = {
        relativePath: 'matching.md',
        content: '**Keywords:** fork'
      }
      const nonMatchingFile: KnowledgeFileEntry = {
        relativePath: 'nonmatching.md',
        content: '**Keywords:** unrelated'
      }
      mockRepo.mockReturnValue([matchingFile, nonMatchingFile])
      const result = domain.search({ query: 'fork', include_draft: false })
      expect(result.results).toHaveLength(1)
      expect(result.results[0].file_path).toBe('matching.md')
    })

    it('should include title from markdown heading when present', () => {
      const file: KnowledgeFileEntry = {
        relativePath: 'test/file.md',
        content: '# My Test Title\n\n**Keywords:** fork'
      }
      mockRepo.mockReturnValue([file])
      const result = domain.search({ query: 'fork', include_draft: false })
      expect(result.results[0].title).toBe('My Test Title')
    })

    it('should fallback to filename when no markdown heading', () => {
      const file: KnowledgeFileEntry = {
        relativePath: 'test/myfile.md',
        content: '**Keywords:** fork'
      }
      mockRepo.mockReturnValue([file])
      const result = domain.search({ query: 'fork', include_draft: false })
      expect(result.results[0].title).toBe('myfile')
    })

    it('should include excerpt around matched term', () => {
      const file: KnowledgeFileEntry = {
        relativePath: 'test/file.md',
        content: 'Line 1\nLine 2 with fork mentioned\nLine 3\nLine 4\nLine 5\n**Keywords:** fork'
      }
      mockRepo.mockReturnValue([file])
      const result = domain.search({ query: 'fork', include_draft: false })
      expect(result.results[0].excerpt).toContain('fork')
    })

    it('should fallback to content slice when no matched term found in file', () => {
      const file: KnowledgeFileEntry = {
        relativePath: 'test/file.md',
        content: '**Keywords:** fork'
      }
      mockRepo.mockReturnValue([file])
      const result = domain.search({ query: 'fork', include_draft: false })
      expect(result.results[0].excerpt).toBe('**Keywords:** fork')
    })

    it('should pass include_draft flag to repo.loadAll', () => {
      mockRepo.mockReturnValue([])
      domain.search({ query: 'test', include_draft: true })
      expect(mockRepo).toHaveBeenCalledWith(true)
    })

    it('should return results with correct total count', () => {
      const files: KnowledgeFileEntry[] = [
        { relativePath: 'a.md', content: '**Keywords:** fork' },
        { relativePath: 'b.md', content: '**Keywords:** fork' },
        { relativePath: 'c.md', content: '**Keywords:** session' }
      ]
      mockRepo.mockReturnValue(files)
      const result = domain.search({ query: 'fork', include_draft: false })
      expect(result.total).toBe(2)
    })

    it('should preserve query in result', () => {
      mockRepo.mockReturnValue([])
      const result = domain.search({ query: 'my search', include_draft: false })
      expect(result.query).toBe('my search')
    })

    it('should handle case-insensitive query matching', () => {
      const file: KnowledgeFileEntry = {
        relativePath: 'test/file.md',
        content: '**Keywords:** Fork'
      }
      mockRepo.mockReturnValue([file])
      const result = domain.search({ query: 'FORK', include_draft: false })
      expect(result.results).toHaveLength(1)
    })

    it('should handle multiple OR groups and return first match', () => {
      const file: KnowledgeFileEntry = {
        relativePath: 'test/file.md',
        content: '**Keywords:** session'
      }
      mockRepo.mockReturnValue([file])
      const result = domain.search({ query: 'fork OR session', include_draft: false })
      expect(result.results).toHaveLength(1)
      expect(result.results[0].matched_terms).toEqual(['session'])
    })

    it('should handle AND keyword in query', () => {
      const file: KnowledgeFileEntry = {
        relativePath: 'test/file.md',
        content: '**Keywords:** fork, session'
      }
      mockRepo.mockReturnValue([file])
      const result = domain.search({ query: 'fork AND session', include_draft: false })
      expect(result.results).toHaveLength(1)
    })
  })

  describe('search with multiple files and complex queries', () => {
    it('should process multiple files correctly', () => {
      const files: KnowledgeFileEntry[] = [
        {
          relativePath: 'docs/fork.md',
          content: '# Fork Documentation\n\n**Keywords:** fork, git'
        },
        {
          relativePath: 'docs/branch.md',
          content: '# Branch Documentation\n\n**Keywords:** branch, git'
        },
        {
          relativePath: 'docs/merge.md',
          content: '# Merge Documentation\n\n**Keywords:** merge, git'
        }
      ]
      mockRepo.mockReturnValue(files)
      const result = domain.search({ query: 'git', include_draft: false })
      expect(result.total).toBe(3)
      expect(result.results.map((r) => r.file_path)).toEqual([
        'docs/fork.md',
        'docs/branch.md',
        'docs/merge.md'
      ])
    })

    it('should match only files with matching terms when multiple files present', () => {
      const files: KnowledgeFileEntry[] = [
        { relativePath: 'a.md', content: '**Keywords:** fork' },
        { relativePath: 'b.md', content: '**Keywords:** session' },
        { relativePath: 'c.md', content: '**Keywords:** fork, git' }
      ]
      mockRepo.mockReturnValue(files)
      const result = domain.search({ query: 'fork', include_draft: false })
      expect(result.total).toBe(2)
      expect(result.results.map((r) => r.file_path)).toEqual(['a.md', 'c.md'])
    })

    it('should handle query with multiple AND terms matching some files', () => {
      const files: KnowledgeFileEntry[] = [
        { relativePath: 'a.md', content: '**Keywords:** fork' },
        { relativePath: 'b.md', content: '**Keywords:** fork, session' }
      ]
      mockRepo.mockReturnValue(files)
      const result = domain.search({ query: 'fork session', include_draft: false })
      expect(result.total).toBe(1)
      expect(result.results[0].file_path).toBe('b.md')
    })

    it('should return empty results when no files match any OR group', () => {
      const files: KnowledgeFileEntry[] = [
        { relativePath: 'a.md', content: '**Keywords:** foo' },
        { relativePath: 'b.md', content: '**Keywords:** bar' }
      ]
      mockRepo.mockReturnValue(files)
      const result = domain.search({ query: 'baz OR qux', include_draft: false })
      expect(result.total).toBe(0)
      expect(result.results).toEqual([])
    })

    it('should extract title and excerpt for each matched file', () => {
      const files: KnowledgeFileEntry[] = [
        {
          relativePath: 'doc1.md',
          content: '# First Document\n\nThis talks about fork\n\n**Keywords:** fork'
        },
        {
          relativePath: 'doc2.md',
          content: '# Second Document\n\nThis also mentions fork\n\n**Keywords:** fork'
        }
      ]
      mockRepo.mockReturnValue(files)
      const result = domain.search({ query: 'fork', include_draft: false })
      expect(result.results).toHaveLength(2)
      expect(result.results[0].title).toBe('First Document')
      expect(result.results[1].title).toBe('Second Document')
    })
  })

  describe('search with excerpt generation', () => {
    it('should extract excerpt containing matched term with context', () => {
      const file: KnowledgeFileEntry = {
        relativePath: 'test.md',
        content: 'Line 1\nLine 2\nLine 3 fork here\nLine 4\nLine 5\nLine 6\n**Keywords:** fork'
      }
      mockRepo.mockReturnValue([file])
      const result = domain.search({ query: 'fork', include_draft: false })
      const excerpt = result.results[0].excerpt
      expect(excerpt).toContain('fork')
    })

    it('should truncate excerpt to 300 characters', () => {
      const longContent = 'word '.repeat(100)
      const file: KnowledgeFileEntry = {
        relativePath: 'test.md',
        content: longContent + '\n**Keywords:** word'
      }
      mockRepo.mockReturnValue([file])
      const result = domain.search({ query: 'word', include_draft: false })
      expect(result.results[0].excerpt.length).toBeLessThanOrEqual(300)
    })

    it('should fallback to content slice when no line contains matched term', () => {
      const file: KnowledgeFileEntry = {
        relativePath: 'test.md',
        content: 'This is content without the keyword mentioned in text\n**Keywords:** someterm'
      }
      mockRepo.mockReturnValue([file])
      const result = domain.search({ query: 'someterm', include_draft: false })
      expect(result.results[0].excerpt).toBeTruthy()
    })
  })

  describe('query parsing edge cases', () => {
    it('should handle query with mixed case OR', () => {
      mockRepo.mockReturnValue([{ relativePath: 'a.md', content: '**Keywords:** fork' }])
      const result = domain.search({ query: 'fork or session', include_draft: false })
      expect(result.results).toHaveLength(1)
    })

    it('should handle query with uppercase OR', () => {
      mockRepo.mockReturnValue([{ relativePath: 'a.md', content: '**Keywords:** fork' }])
      const result = domain.search({ query: 'fork OR session', include_draft: false })
      expect(result.results).toHaveLength(1)
    })

    it('should strip AND keywords from query', () => {
      mockRepo.mockReturnValue([{ relativePath: 'a.md', content: '**Keywords:** fork, session' }])
      const result = domain.search({ query: 'fork AND session', include_draft: false })
      expect(result.results).toHaveLength(1)
    })

    it('should handle leading/trailing whitespace in query', () => {
      mockRepo.mockReturnValue([{ relativePath: 'a.md', content: '**Keywords:** fork' }])
      const result = domain.search({ query: '  fork  ', include_draft: false })
      expect(result.results).toHaveLength(1)
    })
  })

  describe('keywords extraction edge cases', () => {
    it('should handle multiple commas in keywords', () => {
      mockRepo.mockReturnValue([
        { relativePath: 'a.md', content: '**Keywords:** fork, session, branch' }
      ])
      const result = domain.search({ query: 'session', include_draft: false })
      expect(result.results).toHaveLength(1)
    })

    it('should handle keywords with whitespace', () => {
      mockRepo.mockReturnValue([
        { relativePath: 'a.md', content: '**Keywords:**  fork  ,  session  ' }
      ])
      const result = domain.search({ query: 'fork', include_draft: false })
      expect(result.results).toHaveLength(1)
    })

    it('should handle empty keywords field', () => {
      mockRepo.mockReturnValue([{ relativePath: 'a.md', content: 'Some content\n**Keywords:** ' }])
      const result = domain.search({ query: 'content', include_draft: false })
      expect(result.results).toHaveLength(1)
    })
  })

  describe('title extraction edge cases', () => {
    it('should handle multiple headings by using first one', () => {
      mockRepo.mockReturnValue([
        { relativePath: 'a.md', content: '# First Title\n\n# Second Title\n\n**Keywords:** test' }
      ])
      const result = domain.search({ query: 'test', include_draft: false })
      expect(result.results[0].title).toBe('First Title')
    })

    it('should trim whitespace from heading', () => {
      mockRepo.mockReturnValue([
        { relativePath: 'a.md', content: '#   Spaced Title   \n\n**Keywords:** test' }
      ])
      const result = domain.search({ query: 'test', include_draft: false })
      expect(result.results[0].title).toBe('Spaced Title')
    })

    it('should handle filepath with multiple slashes', () => {
      mockRepo.mockReturnValue([{ relativePath: 'a/b/c/file.md', content: '**Keywords:** test' }])
      const result = domain.search({ query: 'test', include_draft: false })
      expect(result.results[0].title).toBe('file')
    })

    it('should handle filepath without .md extension', () => {
      mockRepo.mockReturnValue([{ relativePath: 'docs/README', content: '**Keywords:** test' }])
      const result = domain.search({ query: 'test', include_draft: false })
      expect(result.results[0].title).toBe('README')
    })

    it('should use full path when no filename found', () => {
      mockRepo.mockReturnValue([{ relativePath: '', content: '**Keywords:** test' }])
      const result = domain.search({ query: 'test', include_draft: false })
      expect(result.results[0].title).toBe('')
    })
  })

  describe('matching with keywords priority', () => {
    it('should prefer keywords field over full content when both have matches', () => {
      mockRepo.mockReturnValue([
        {
          relativePath: 'a.md',
          content: 'fork fork fork fork fork\n**Keywords:** session'
        }
      ])
      const result = domain.search({ query: 'fork', include_draft: false })
      expect(result.results).toHaveLength(0)
    })

    it('should return matched terms from keywords when searching', () => {
      mockRepo.mockReturnValue([{ relativePath: 'a.md', content: '**Keywords:** fork, session' }])
      const result = domain.search({ query: 'fork', include_draft: false })
      expect(result.results[0].matched_terms).toEqual(['fork'])
    })

    it('should return matched terms from content when no keywords present', () => {
      mockRepo.mockReturnValue([{ relativePath: 'a.md', content: 'This is about fork behavior' }])
      const result = domain.search({ query: 'fork', include_draft: false })
      expect(result.results[0].matched_terms).toEqual(['fork'])
    })
  })
})
