import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, renameSync } from 'fs'
import { dirname } from 'path'
import { moveFile } from '../fileMove.js'

vi.mock('fs')
vi.mock('path')

const mockMkdirSync = vi.mocked(mkdirSync)
const mockRenameSync = vi.mocked(renameSync)
const mockDirname = vi.mocked(dirname)

describe('moveFile', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockDirname.mockReturnValue('/dest/dir')
  })

  it('calls dirname with the destination path', () => {
    moveFile('/src/file.txt', '/dest/dir/file.txt')
    expect(mockDirname).toHaveBeenCalledWith('/dest/dir/file.txt')
  })

  it('creates the destination directory with recursive: true', () => {
    moveFile('/src/file.txt', '/dest/dir/file.txt')
    expect(mockMkdirSync).toHaveBeenCalledWith('/dest/dir', { recursive: true })
  })

  it('renames the file from src to dest', () => {
    moveFile('/src/file.txt', '/dest/dir/file.txt')
    expect(mockRenameSync).toHaveBeenCalledWith('/src/file.txt', '/dest/dir/file.txt')
  })

  it('propagates errors thrown by mkdirSync', () => {
    mockMkdirSync.mockImplementation(() => {
      throw new Error('EACCES: permission denied')
    })
    expect(() => moveFile('/src/file.txt', '/dest/dir/file.txt')).toThrow(
      'EACCES: permission denied'
    )
  })

  it('does not call renameSync when mkdirSync throws', () => {
    mockMkdirSync.mockImplementation(() => {
      throw new Error('EACCES: permission denied')
    })
    try {
      moveFile('/src/file.txt', '/dest/dir/file.txt')
    } catch {
      // expected
    }
    expect(mockRenameSync).not.toHaveBeenCalled()
  })

  it('propagates errors thrown by renameSync', () => {
    mockRenameSync.mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory')
    })
    expect(() => moveFile('/src/file.txt', '/dest/dir/file.txt')).toThrow(
      'ENOENT: no such file or directory'
    )
  })
})
