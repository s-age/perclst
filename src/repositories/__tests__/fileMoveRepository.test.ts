import { vi, describe, it, expect, beforeEach } from 'vitest'
import { PipelineFileRepository } from '@src/repositories/fileMoveRepository'
import type { FileMoveInfra } from '@src/infrastructures/fileMove'
import type { FsInfra } from '@src/infrastructures/fs'

type PipelineFileFs = Pick<
  FsInfra,
  'readJson' | 'writeJson' | 'readYaml' | 'writeYaml' | 'cleanDir'
>

describe('PipelineFileRepository', () => {
  let repo: PipelineFileRepository
  let mockFileMoveInfra: FileMoveInfra
  let mockFs: PipelineFileFs

  beforeEach(() => {
    vi.clearAllMocks()
    mockFileMoveInfra = { moveFile: vi.fn() } as unknown as FileMoveInfra
    mockFs = {
      readJson: vi.fn(),
      writeJson: vi.fn(),
      readYaml: vi.fn(),
      writeYaml: vi.fn(),
      cleanDir: vi.fn()
    } as unknown as PipelineFileFs
    repo = new PipelineFileRepository(mockFileMoveInfra, mockFs)
  })

  // ─── moveToDone ────────────────────────────────────────────────────────────

  describe('moveToDone', () => {
    it('delegates to moveFile with the provided src and dest paths', () => {
      repo.moveToDone('/tmp/a.json', '/done/a.json')

      expect(mockFileMoveInfra.moveFile).toHaveBeenCalledWith('/tmp/a.json', '/done/a.json')
    })
  })

  // ─── readRaw ───────────────────────────────────────────────────────────────

  describe('readRaw', () => {
    it('calls readJson for .json paths', () => {
      const fixture = { key: 'value' }
      vi.mocked(mockFs.readJson).mockReturnValue(fixture)

      const result = repo.readRaw('/some/file.json')

      expect(result).toBe(fixture)
      expect(mockFs.readJson).toHaveBeenCalledWith('/some/file.json')
      expect(mockFs.readYaml).not.toHaveBeenCalled()
    })

    it('calls readYaml for .yaml paths', () => {
      const fixture = { tasks: [] }
      vi.mocked(mockFs.readYaml).mockReturnValue(fixture)

      const result = repo.readRaw('/some/file.yaml')

      expect(result).toBe(fixture)
      expect(mockFs.readYaml).toHaveBeenCalledWith('/some/file.yaml')
      expect(mockFs.readJson).not.toHaveBeenCalled()
    })

    it('calls readYaml for .yml paths', () => {
      const fixture = { tasks: [] }
      vi.mocked(mockFs.readYaml).mockReturnValue(fixture)

      const result = repo.readRaw('/some/file.yml')

      expect(result).toBe(fixture)
      expect(mockFs.readYaml).toHaveBeenCalledWith('/some/file.yml')
      expect(mockFs.readJson).not.toHaveBeenCalled()
    })

    it('returns null when readJson returns null', () => {
      vi.mocked(mockFs.readJson).mockReturnValue(null)

      const result = repo.readRaw('/null.json')

      expect(result).toBeNull()
    })
  })

  // ─── write ─────────────────────────────────────────────────────────────────

  describe('write', () => {
    it('calls writeJson for .json paths', () => {
      const data = { hello: 'world' }

      repo.write('/out/file.json', data)

      expect(mockFs.writeJson).toHaveBeenCalledWith('/out/file.json', data)
      expect(mockFs.writeYaml).not.toHaveBeenCalled()
    })

    it('calls writeYaml for .yaml paths', () => {
      const data = { tasks: [] }

      repo.write('/out/file.yaml', data)

      expect(mockFs.writeYaml).toHaveBeenCalledWith('/out/file.yaml', data)
      expect(mockFs.writeJson).not.toHaveBeenCalled()
    })

    it('calls writeYaml for .yml paths', () => {
      const data = { tasks: [] }

      repo.write('/out/file.yml', data)

      expect(mockFs.writeYaml).toHaveBeenCalledWith('/out/file.yml', data)
      expect(mockFs.writeJson).not.toHaveBeenCalled()
    })

    it('passes null data through to writeJson', () => {
      repo.write('/out/null.json', null)

      expect(mockFs.writeJson).toHaveBeenCalledWith('/out/null.json', null)
    })
  })

  // ─── cleanDir ──────────────────────────────────────────────────────────────

  describe('cleanDir', () => {
    it('delegates to the fs cleanDir with the provided directory path', () => {
      repo.cleanDir('/tmp/workdir')

      expect(mockFs.cleanDir).toHaveBeenCalledWith('/tmp/workdir')
    })
  })
})
