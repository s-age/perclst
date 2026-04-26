import { vi, describe, it, expect, beforeEach } from 'vitest'
import { PipelineFileRepository } from '@src/repositories/fileMoveRepository'

vi.mock('@src/infrastructures/fileMove', () => ({
  moveFile: vi.fn()
}))

vi.mock('@src/infrastructures/fs', () => ({
  readJson: vi.fn(),
  writeJson: vi.fn(),
  readYaml: vi.fn(),
  writeYaml: vi.fn(),
  cleanDir: vi.fn()
}))

import { moveFile } from '@src/infrastructures/fileMove'
import { readJson, writeJson, readYaml, writeYaml, cleanDir } from '@src/infrastructures/fs'

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

  // ─── readRaw ───────────────────────────────────────────────────────────────

  describe('readRaw', () => {
    it('calls readJson for .json paths', () => {
      const fixture = { key: 'value' }
      vi.mocked(readJson).mockReturnValue(fixture)

      const result = repo.readRaw('/some/file.json')

      expect(result).toBe(fixture)
      expect(readJson).toHaveBeenCalledWith('/some/file.json')
      expect(readYaml).not.toHaveBeenCalled()
    })

    it('calls readYaml for .yaml paths', () => {
      const fixture = { tasks: [] }
      vi.mocked(readYaml).mockReturnValue(fixture)

      const result = repo.readRaw('/some/file.yaml')

      expect(result).toBe(fixture)
      expect(readYaml).toHaveBeenCalledWith('/some/file.yaml')
      expect(readJson).not.toHaveBeenCalled()
    })

    it('calls readYaml for .yml paths', () => {
      const fixture = { tasks: [] }
      vi.mocked(readYaml).mockReturnValue(fixture)

      const result = repo.readRaw('/some/file.yml')

      expect(result).toBe(fixture)
      expect(readYaml).toHaveBeenCalledWith('/some/file.yml')
      expect(readJson).not.toHaveBeenCalled()
    })

    it('returns null when readJson returns null', () => {
      vi.mocked(readJson).mockReturnValue(null)

      const result = repo.readRaw('/null.json')

      expect(result).toBeNull()
    })
  })

  // ─── write ─────────────────────────────────────────────────────────────────

  describe('write', () => {
    it('calls writeJson for .json paths', () => {
      const data = { hello: 'world' }

      repo.write('/out/file.json', data)

      expect(writeJson).toHaveBeenCalledWith('/out/file.json', data)
      expect(writeYaml).not.toHaveBeenCalled()
    })

    it('calls writeYaml for .yaml paths', () => {
      const data = { tasks: [] }

      repo.write('/out/file.yaml', data)

      expect(writeYaml).toHaveBeenCalledWith('/out/file.yaml', data)
      expect(writeJson).not.toHaveBeenCalled()
    })

    it('calls writeYaml for .yml paths', () => {
      const data = { tasks: [] }

      repo.write('/out/file.yml', data)

      expect(writeYaml).toHaveBeenCalledWith('/out/file.yml', data)
      expect(writeJson).not.toHaveBeenCalled()
    })

    it('passes null data through to writeJson', () => {
      repo.write('/out/null.json', null)

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
