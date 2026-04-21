import { vi, describe, it, expect, beforeEach } from 'vitest'
import { KnowledgeSearchRepository } from '@src/repositories/knowledgeSearchRepository'
import { listFilesRecursive, readTextFile } from '@src/infrastructures/knowledgeReader'

vi.mock('@src/infrastructures/knowledgeReader', () => ({
  listFilesRecursive: vi.fn(),
  readTextFile: vi.fn()
}))

const mockListFilesRecursive = vi.mocked(listFilesRecursive)
const mockReadTextFile = vi.mocked(readTextFile)

describe('KnowledgeSearchRepository', () => {
  let repo: KnowledgeSearchRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new KnowledgeSearchRepository('/knowledge')
  })

  // ─── loadAll ──────────────────────────────────────────────────────────────

  describe('loadAll', () => {
    it('returns entries for all files including draft when includeDraft is true', () => {
      mockListFilesRecursive.mockReturnValue([
        { absolute: '/knowledge/foo.md', relative: 'foo.md' },
        { absolute: '/knowledge/draft/bar.md', relative: 'draft/bar.md' }
      ])
      mockReadTextFile.mockImplementation((path) => `content of ${path}`)

      expect(repo.loadAll(true)).toEqual([
        { relativePath: 'foo.md', content: 'content of /knowledge/foo.md' },
        { relativePath: 'draft/bar.md', content: 'content of /knowledge/draft/bar.md' }
      ])
    })

    it('excludes draft entries when includeDraft is false', () => {
      mockListFilesRecursive.mockReturnValue([
        { absolute: '/knowledge/foo.md', relative: 'foo.md' },
        { absolute: '/knowledge/draft/bar.md', relative: 'draft/bar.md' }
      ])
      mockReadTextFile.mockImplementation((path) => `content of ${path}`)

      expect(repo.loadAll(false)).toEqual([
        { relativePath: 'foo.md', content: 'content of /knowledge/foo.md' }
      ])
    })

    it('returns an empty array when no files exist', () => {
      mockListFilesRecursive.mockReturnValue([])

      expect(repo.loadAll(true)).toEqual([])
    })
  })

  // ─── hasDraftEntries ──────────────────────────────────────────────────────

  describe('hasDraftEntries', () => {
    it('returns true when draft directory contains files', () => {
      mockListFilesRecursive.mockReturnValue([
        { absolute: '/knowledge/draft/foo.md', relative: 'draft/foo.md' }
      ])

      expect(repo.hasDraftEntries()).toBe(true)
    })

    it('returns false when draft directory is empty', () => {
      mockListFilesRecursive.mockReturnValue([])

      expect(repo.hasDraftEntries()).toBe(false)
    })
  })
})
