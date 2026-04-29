import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, renameSync } from 'fs'
import { dirname } from 'path'
import { FileMoveInfra } from '../fileMove'

vi.mock('fs')
vi.mock('path')

const mockMkdirSync = vi.mocked(mkdirSync)
const mockRenameSync = vi.mocked(renameSync)
const mockDirname = vi.mocked(dirname)

describe('FileMoveInfra', () => {
  let infra: FileMoveInfra

  beforeEach(() => {
    vi.resetAllMocks()
    mockDirname.mockReturnValue('/dest/dir')
    infra = new FileMoveInfra()
  })

  it('calls dirname with the destination path', () => {
    infra.moveFile('/src/file.txt', '/dest/dir/file.txt')
    expect(mockDirname).toHaveBeenCalledWith('/dest/dir/file.txt')
  })

  it('creates the destination directory with recursive: true', () => {
    infra.moveFile('/src/file.txt', '/dest/dir/file.txt')
    expect(mockMkdirSync).toHaveBeenCalledWith('/dest/dir', { recursive: true })
  })

  it('renames the file from src to dest', () => {
    infra.moveFile('/src/file.txt', '/dest/dir/file.txt')
    expect(mockRenameSync).toHaveBeenCalledWith('/src/file.txt', '/dest/dir/file.txt')
  })

  it('propagates errors thrown by mkdirSync', () => {
    mockMkdirSync.mockImplementation(() => {
      throw new Error('EACCES: permission denied')
    })
    expect(() => infra.moveFile('/src/file.txt', '/dest/dir/file.txt')).toThrow(
      'EACCES: permission denied'
    )
  })

  it('does not call renameSync when mkdirSync throws', () => {
    mockMkdirSync.mockImplementation(() => {
      throw new Error('EACCES: permission denied')
    })
    try {
      infra.moveFile('/src/file.txt', '/dest/dir/file.txt')
    } catch {
      // expected
    }
    expect(mockRenameSync).not.toHaveBeenCalled()
  })

  it('propagates errors thrown by renameSync', () => {
    mockRenameSync.mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory')
    })
    expect(() => infra.moveFile('/src/file.txt', '/dest/dir/file.txt')).toThrow(
      'ENOENT: no such file or directory'
    )
  })

  it('calls mkdirSync before renameSync even when renameSync throws', () => {
    mockRenameSync.mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory')
    })
    try {
      infra.moveFile('/src/file.txt', '/dest/dir/file.txt')
    } catch {
      // expected
    }
    expect(mockMkdirSync).toHaveBeenCalledWith('/dest/dir', { recursive: true })
  })
})
