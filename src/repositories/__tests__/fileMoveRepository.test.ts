import { vi, describe, it, expect, beforeEach } from 'vitest'
import { PipelineFileRepository } from '@src/repositories/fileMoveRepository'
import type { FileMoveInfra } from '@src/infrastructures/fileMove'
import type { Dirent } from 'fs'
import type { FsInfra } from '@src/infrastructures/fs'

type PipelineFileFs = Pick<
  FsInfra,
  'readText' | 'writeText' | 'fileExists' | 'listDirEntries' | 'removeFileSync'
>

describe('PipelineFileRepository', () => {
  let repo: PipelineFileRepository
  let mockFileMoveInfra: FileMoveInfra
  let mockFs: PipelineFileFs

  beforeEach(() => {
    vi.clearAllMocks()
    mockFileMoveInfra = { moveFile: vi.fn() } as unknown as FileMoveInfra
    mockFs = {
      readText: vi.fn(),
      writeText: vi.fn(),
      fileExists: vi.fn().mockReturnValue(true),
      listDirEntries: vi.fn().mockReturnValue([]),
      removeFileSync: vi.fn()
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
    it('parses JSON for .json paths', () => {
      const fixture = { key: 'value' }
      vi.mocked(mockFs.readText).mockReturnValue(JSON.stringify(fixture))

      const result = repo.readRaw('/some/file.json')

      expect(result).toEqual(fixture)
      expect(mockFs.readText).toHaveBeenCalledWith('/some/file.json')
    })

    it('parses YAML for .yaml paths', () => {
      vi.mocked(mockFs.readText).mockReturnValue('tasks: []\n')

      const result = repo.readRaw('/some/file.yaml')

      expect(result).toEqual({ tasks: [] })
      expect(mockFs.readText).toHaveBeenCalledWith('/some/file.yaml')
    })

    it('parses YAML for .yml paths', () => {
      vi.mocked(mockFs.readText).mockReturnValue('tasks: []\n')

      const result = repo.readRaw('/some/file.yml')

      expect(result).toEqual({ tasks: [] })
      expect(mockFs.readText).toHaveBeenCalledWith('/some/file.yml')
    })

    it('returns null when JSON content is null', () => {
      vi.mocked(mockFs.readText).mockReturnValue('null')

      const result = repo.readRaw('/null.json')

      expect(result).toBeNull()
    })
  })

  // ─── write ─────────────────────────────────────────────────────────────────

  describe('write', () => {
    it('writes JSON for .json paths', () => {
      const data = { hello: 'world' }

      repo.write('/out/file.json', data)

      expect(mockFs.writeText).toHaveBeenCalledWith('/out/file.json', JSON.stringify(data, null, 2))
    })

    it('writes YAML for .yaml paths', () => {
      const data = { tasks: [] }

      repo.write('/out/file.yaml', data)

      expect(mockFs.writeText).toHaveBeenCalledWith(
        '/out/file.yaml',
        expect.stringContaining('tasks')
      )
    })

    it('writes YAML for .yml paths', () => {
      const data = { tasks: [] }

      repo.write('/out/file.yml', data)

      expect(mockFs.writeText).toHaveBeenCalledWith(
        '/out/file.yml',
        expect.stringContaining('tasks')
      )
    })

    it('passes null data through to writeText as JSON', () => {
      repo.write('/out/null.json', null)

      expect(mockFs.writeText).toHaveBeenCalledWith('/out/null.json', JSON.stringify(null, null, 2))
    })
  })

  // ─── cleanDir ──────────────────────────────────────────────────────────────

  describe('cleanDir', () => {
    it('removes files in the directory', () => {
      vi.mocked(mockFs.listDirEntries).mockReturnValue([
        { name: 'a.tmp', isFile: () => true } as unknown as Dirent
      ])

      repo.cleanDir('/tmp/workdir')

      expect(mockFs.removeFileSync).toHaveBeenCalledWith('/tmp/workdir/a.tmp')
    })

    it('skips non-file entries', () => {
      vi.mocked(mockFs.listDirEntries).mockReturnValue([
        { name: 'subdir', isFile: () => false } as unknown as Dirent
      ])

      repo.cleanDir('/tmp/workdir')

      expect(mockFs.removeFileSync).not.toHaveBeenCalled()
    })

    it('does nothing when the directory does not exist', () => {
      vi.mocked(mockFs.fileExists).mockReturnValue(false)

      repo.cleanDir('/nonexistent')

      expect(mockFs.listDirEntries).not.toHaveBeenCalled()
    })
  })
})
