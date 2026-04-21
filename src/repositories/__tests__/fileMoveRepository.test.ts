import { vi, describe, it, expect, beforeEach } from 'vitest'
import { PipelineFileRepository } from '@src/repositories/fileMoveRepository'

vi.mock('@src/infrastructures/fileMove', () => ({
  moveFile: vi.fn()
}))

vi.mock('@src/infrastructures/fs', () => ({
  readJson: vi.fn(),
  writeJson: vi.fn(),
  cleanDir: vi.fn()
}))

import { moveFile } from '@src/infrastructures/fileMove'
import { readJson, writeJson, cleanDir } from '@src/infrastructures/fs'

describe('PipelineFileRepository', () => {
  let repo: PipelineFileRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new PipelineFileRepository()
  })

  // ─── moveToDone ────────────────────────────────────────────────────────────

  describe('moveToDone', () => {
    it('delegates to moveFile with the provided src and dest paths', () => {
      repo.moveToDone('/tmp/a.json', '/done/a.json')

      expect(moveFile).toHaveBeenCalledWith('/tmp/a.json', '/done/a.json')
    })
  })

  // ─── readRawJson ───────────────────────────────────────────────────────────

  describe('readRawJson', () => {
    it('returns the value produced by readJson for the given path', () => {
      const fixture = { key: 'value' }
      vi.mocked(readJson).mockReturnValue(fixture)

      const result = repo.readRawJson('/some/file.json')

      expect(result).toBe(fixture)
    })

    it('passes the path argument through to readJson', () => {
      repo.readRawJson('/some/file.json')

      expect(readJson).toHaveBeenCalledWith('/some/file.json')
    })

    it('returns null when readJson returns null', () => {
      vi.mocked(readJson).mockReturnValue(null)

      const result = repo.readRawJson('/null.json')

      expect(result).toBeNull()
    })
  })

  // ─── writeJson ─────────────────────────────────────────────────────────────

  describe('writeJson', () => {
    it('delegates to the fs writeJson with the provided path and data', () => {
      const data = { hello: 'world' }

      repo.writeJson('/out/file.json', data)

      expect(writeJson).toHaveBeenCalledWith('/out/file.json', data)
    })

    it('passes null data through to the fs writeJson', () => {
      repo.writeJson('/out/null.json', null)

      expect(writeJson).toHaveBeenCalledWith('/out/null.json', null)
    })
  })

  // ─── cleanDir ──────────────────────────────────────────────────────────────

  describe('cleanDir', () => {
    it('delegates to the fs cleanDir with the provided directory path', () => {
      repo.cleanDir('/tmp/workdir')

      expect(cleanDir).toHaveBeenCalledWith('/tmp/workdir')
    })
  })
})
