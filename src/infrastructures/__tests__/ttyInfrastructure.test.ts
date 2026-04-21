import { vi, describe, it, expect, beforeEach } from 'vitest'
import { openSync, writeSync, readSync, closeSync } from 'fs'

vi.mock('fs', () => ({
  openSync: vi.fn(),
  writeSync: vi.fn(),
  readSync: vi.fn(),
  closeSync: vi.fn()
}))

const mockOpenSync = vi.mocked(openSync)
const mockWriteSync = vi.mocked(writeSync)
const mockReadSync = vi.mocked(readSync)
const mockCloseSync = vi.mocked(closeSync)

import { openTty, writeTty, readTty, closeTty } from '../ttyInfrastructure.js'

// ---------------------------------------------------------------------------
// openTty
// ---------------------------------------------------------------------------
describe('openTty', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the file descriptor when openSync succeeds', () => {
    mockOpenSync.mockReturnValue(3)
    expect(openTty()).toBe(3)
    expect(mockOpenSync).toHaveBeenCalledWith('/dev/tty', 'r+')
  })

  it('returns null when openSync throws', () => {
    mockOpenSync.mockImplementation(() => {
      throw new Error('no /dev/tty')
    })
    expect(openTty()).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// writeTty
// ---------------------------------------------------------------------------
describe('writeTty', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls writeSync with the given fd and text', () => {
    writeTty(3, 'hello')
    expect(mockWriteSync).toHaveBeenCalledWith(3, 'hello')
  })
})

// ---------------------------------------------------------------------------
// readTty
// ---------------------------------------------------------------------------
describe('readTty', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the string decoded from the bytes readSync fills into the buffer', () => {
    mockReadSync.mockImplementation((_fd, buf) => {
      const data = Buffer.from('hello')
      data.copy(buf as Buffer)
      return data.length
    })
    expect(readTty(3)).toBe('hello')
  })

  it('returns an empty string when readSync reports zero bytes read', () => {
    mockReadSync.mockReturnValue(0)
    expect(readTty(3)).toBe('')
  })

  it('calls readSync with default maxBytes of 256', () => {
    mockReadSync.mockReturnValue(0)
    readTty(3)
    expect(mockReadSync).toHaveBeenCalledWith(3, expect.any(Buffer), 0, 256, null)
  })

  it('calls readSync with the custom maxBytes when provided', () => {
    mockReadSync.mockReturnValue(0)
    readTty(3, 64)
    expect(mockReadSync).toHaveBeenCalledWith(3, expect.any(Buffer), 0, 64, null)
  })
})

// ---------------------------------------------------------------------------
// closeTty
// ---------------------------------------------------------------------------
describe('closeTty', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls closeSync with the given fd', () => {
    closeTty(5)
    expect(mockCloseSync).toHaveBeenCalledWith(5)
  })
})
