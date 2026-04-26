import { vi, describe, it, expect, beforeEach } from 'vitest'
import { KnowledgeSearchRepository } from '@src/repositories/knowledgeSearchRepository'
import type { KnowledgeReaderInfra } from '@src/infrastructures/knowledgeReader'

describe('KnowledgeSearchRepository', () => {
  let repo: KnowledgeSearchRepository
  let mockReader: KnowledgeReaderInfra

  beforeEach(() => {
    vi.clearAllMocks()
    mockReader = {
      listFilesRecursive: vi.fn(),
      readTextFile: vi.fn()
    } as unknown as KnowledgeReaderInfra
    repo = new KnowledgeSearchRepository(mockReader, '/knowledge')
  })

  // ─── loadAll ──────────────────────────────────────────────────────────────

  describe('loadAll', () => {
    it('returns entries for all files including draft when includeDraft is true', () => {
      vi.mocked(mockReader.listFilesRecursive).mockReturnValue([
        { absolute: '/knowledge/foo.md', relative: 'foo.md' },
        { absolute: '/knowledge/draft/bar.md', relative: 'draft/bar.md' }
      ])
      vi.mocked(mockReader.readTextFile).mockImplementation((path) => `content of ${path}`)

      expect(repo.loadAll(true)).toEqual([
        { relativePath: 'foo.md', content: 'content of /knowledge/foo.md' },
        { relativePath: 'draft/bar.md', content: 'content of /knowledge/draft/bar.md' }
      ])
    })

    it('excludes draft entries when includeDraft is false', () => {
      vi.mocked(mockReader.listFilesRecursive).mockReturnValue([
        { absolute: '/knowledge/foo.md', relative: 'foo.md' },
        { absolute: '/knowledge/draft/bar.md', relative: 'draft/bar.md' }
      ])
      vi.mocked(mockReader.readTextFile).mockImplementation((path) => `content of ${path}`)

      expect(repo.loadAll(false)).toEqual([
        { relativePath: 'foo.md', content: 'content of /knowledge/foo.md' }
      ])
    })

    it('returns an empty array when no files exist', () => {
      vi.mocked(mockReader.listFilesRecursive).mockReturnValue([])

      expect(repo.loadAll(true)).toEqual([])
    })
  })

  // ─── hasDraftEntries ──────────────────────────────────────────────────────

  describe('hasDraftEntries', () => {
    it('returns true when draft directory contains files', () => {
      vi.mocked(mockReader.listFilesRecursive).mockReturnValue([
        { absolute: '/knowledge/draft/foo.md', relative: 'draft/foo.md' }
      ])

      expect(repo.hasDraftEntries()).toBe(true)
    })

    it('returns false when draft directory is empty', () => {
      vi.mocked(mockReader.listFilesRecursive).mockReturnValue([])

      expect(repo.hasDraftEntries()).toBe(false)
    })
  })
})
