import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { executeKnowledgeSearch } from '@src/mcp/tools/knowledgeSearch'
import { setupContainer } from '@src/core/di/setup'
import { makeTmpDir, buildTestConfig } from '@src/cli/commands/__tests__/integration/helpers'
import { KnowledgeSearchRepository } from '@src/repositories/knowledgeSearchRepository'
import { KnowledgeReaderInfra } from '@src/infrastructures/knowledgeReader'
import type { KnowledgeSearchResult } from '@src/types/knowledgeSearch'

describe('executeKnowledgeSearch (integration)', () => {
  let dir: string
  let cleanup: () => void
  let knowledgeDir: string

  beforeEach(() => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())
    knowledgeDir = join(dir, 'knowledge')
    mkdirSync(knowledgeDir)
    setupContainer({
      config: buildTestConfig(dir),
      repos: {
        knowledgeSearchRepo: new KnowledgeSearchRepository(new KnowledgeReaderInfra(), knowledgeDir)
      }
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('returns total of 1 in result when query matches knowledge file content', async () => {
      writeFileSync(
        join(knowledgeDir, 'testing.md'),
        '# Testing Guide\nUse vitest for unit tests.\n'
      )

      const result = await executeKnowledgeSearch({ query: 'vitest' })

      const parsed = JSON.parse(result.content[0].text) as KnowledgeSearchResult
      expect(parsed.total).toBe(1)
    })

    it('includes the matched file path in results when query matches knowledge file content', async () => {
      writeFileSync(
        join(knowledgeDir, 'testing.md'),
        '# Testing Guide\nUse vitest for unit tests.\n'
      )

      const result = await executeKnowledgeSearch({ query: 'vitest' })

      const parsed = JSON.parse(result.content[0].text) as KnowledgeSearchResult
      expect(parsed.results[0].file_path).toBe('testing.md')
    })

    it('returns total of 0 in result when query matches no knowledge files', async () => {
      writeFileSync(
        join(knowledgeDir, 'testing.md'),
        '# Testing Guide\nUse vitest for unit tests.\n'
      )

      const result = await executeKnowledgeSearch({ query: 'zxqwerty_nonexistent' })

      const parsed = JSON.parse(result.content[0].text) as KnowledgeSearchResult
      expect(parsed.total).toBe(0)
    })

    it('returns total of 0 in result when knowledge directory is empty', async () => {
      const result = await executeKnowledgeSearch({ query: 'anything' })

      const parsed = JSON.parse(result.content[0].text) as KnowledgeSearchResult
      expect(parsed.total).toBe(0)
    })
  })
})
