import { vi, describe, it, expect, beforeEach } from 'vitest'
import { findProjectRoot } from '../projectRoot'

// Mock Node.js built-ins
vi.mock('fs', () => ({
  existsSync: vi.fn()
}))

vi.mock('path', () => ({
  dirname: vi.fn(),
  join: vi.fn()
}))

vi.mock('url', () => ({
  fileURLToPath: vi.fn()
}))

import { existsSync } from 'fs'
import type { PathLike } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

describe('findProjectRoot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the directory containing package.json when found on the first iteration', () => {
    vi.mocked(fileURLToPath).mockReturnValue(
      '/home/user/project/src/infrastructures/projectRoot.ts'
    )
    vi.mocked(dirname).mockImplementation((p: string) => {
      if (p === '/home/user/project/src/infrastructures/projectRoot.ts') {
        return '/home/user/project/src/infrastructures'
      }
      return p
    })
    vi.mocked(join).mockImplementation((dir: string) => `${dir}/package.json`)
    vi.mocked(existsSync).mockImplementation(
      (p: PathLike) => p === '/home/user/project/src/infrastructures/package.json'
    )

    const result = findProjectRoot()

    expect(result).toBe('/home/user/project/src/infrastructures')
  })

  it('returns the parent directory when package.json is one level up', () => {
    vi.mocked(fileURLToPath).mockReturnValue(
      '/home/user/project/src/infrastructures/projectRoot.ts'
    )
    vi.mocked(dirname).mockImplementation((p: string) => {
      const parts = p.split('/').filter(Boolean)
      return '/' + parts.slice(0, -1).join('/')
    })
    vi.mocked(join).mockImplementation((dir: string) => `${dir}/package.json`)
    vi.mocked(existsSync).mockImplementation(
      (p: PathLike) => p === '/home/user/project/src/package.json'
    )

    const result = findProjectRoot()

    expect(result).toBe('/home/user/project/src')
  })

  it('returns the ancestor directory when package.json is multiple levels up', () => {
    vi.mocked(fileURLToPath).mockReturnValue('/home/user/project/src/lib/utils/helpers/file.ts')
    vi.mocked(dirname).mockImplementation((p: string) => {
      const parts = p.split('/').filter(Boolean)
      return '/' + parts.slice(0, -1).join('/')
    })
    vi.mocked(join).mockImplementation((dir: string) => `${dir}/package.json`)
    vi.mocked(existsSync).mockImplementation(
      (p: PathLike) => p === '/home/user/project/package.json'
    )

    const result = findProjectRoot()

    expect(result).toBe('/home/user/project')
  })

  it('falls back to process.cwd() when filesystem root is reached before package.json is found', () => {
    vi.mocked(fileURLToPath).mockReturnValue('/home/file.ts')
    vi.mocked(dirname).mockImplementation((p: string) => {
      const parts = p.split('/').filter(Boolean)
      if (parts.length <= 1) return '/'
      return '/' + parts.slice(0, -1).join('/')
    })
    vi.mocked(join).mockImplementation((dir: string) => `${dir}/package.json`)
    vi.mocked(existsSync).mockReturnValue(false)

    const originalCwd = process.cwd
    process.cwd = vi.fn(() => '/current/working/directory')

    try {
      const result = findProjectRoot()
      expect(result).toBe('/current/working/directory')
    } finally {
      process.cwd = originalCwd
    }
  })

  it('calls process.cwd() when filesystem root is reached before package.json is found', () => {
    vi.mocked(fileURLToPath).mockReturnValue('/home/file.ts')
    vi.mocked(dirname).mockImplementation((p: string) => {
      const parts = p.split('/').filter(Boolean)
      if (parts.length <= 1) return '/'
      return '/' + parts.slice(0, -1).join('/')
    })
    vi.mocked(join).mockImplementation((dir: string) => `${dir}/package.json`)
    vi.mocked(existsSync).mockReturnValue(false)

    const originalCwd = process.cwd
    const mockCwd = vi.fn(() => '/current/working/directory')
    process.cwd = mockCwd

    try {
      findProjectRoot()
      expect(mockCwd).toHaveBeenCalled()
    } finally {
      process.cwd = originalCwd
    }
  })

  it('falls back to process.cwd() after exhausting 8 iterations', () => {
    vi.mocked(fileURLToPath).mockReturnValue('/a/b/c/d/e/f/g/h/i/j/k/file.ts')
    vi.mocked(dirname).mockImplementation((p: string) => {
      const parts = p.split('/').filter(Boolean)
      if (parts.length <= 1) return '/'
      return '/' + parts.slice(0, -1).join('/')
    })
    vi.mocked(join).mockImplementation((dir: string) => `${dir}/package.json`)
    vi.mocked(existsSync).mockReturnValue(false)

    const originalCwd = process.cwd
    process.cwd = vi.fn(() => '/fallback/cwd')

    try {
      const result = findProjectRoot()
      expect(result).toBe('/fallback/cwd')
    } finally {
      process.cwd = originalCwd
    }
  })

  it('calls existsSync exactly 8 times when the iteration limit is exhausted', () => {
    vi.mocked(fileURLToPath).mockReturnValue('/a/b/c/d/e/f/g/h/i/j/k/file.ts')
    vi.mocked(dirname).mockImplementation((p: string) => {
      const parts = p.split('/').filter(Boolean)
      if (parts.length <= 1) return '/'
      return '/' + parts.slice(0, -1).join('/')
    })
    vi.mocked(join).mockImplementation((dir: string) => `${dir}/package.json`)
    vi.mocked(existsSync).mockReturnValue(false)

    const originalCwd = process.cwd
    process.cwd = vi.fn(() => '/fallback/cwd')

    try {
      findProjectRoot()
      expect(existsSync).toHaveBeenCalledTimes(8)
    } finally {
      process.cwd = originalCwd
    }
  })

  it('falls back to process.cwd() when parent equals current directory (early break)', () => {
    vi.mocked(fileURLToPath).mockReturnValue('/a/file.ts')
    vi.mocked(dirname).mockImplementation((p: string) => {
      if (p === '/a/file.ts') return '/a'
      return '/' // root: triggers parent === dir
    })
    vi.mocked(join).mockImplementation((dir: string) => `${dir}/package.json`)
    vi.mocked(existsSync).mockReturnValue(false)

    const originalCwd = process.cwd
    process.cwd = vi.fn(() => '/fallback')

    try {
      const result = findProjectRoot()
      expect(result).toBe('/fallback')
    } finally {
      process.cwd = originalCwd
    }
  })

  it('stops calling existsSync once parent equals current directory', () => {
    vi.mocked(fileURLToPath).mockReturnValue('/a/file.ts')
    vi.mocked(dirname).mockImplementation((p: string) => {
      if (p === '/a/file.ts') return '/a'
      return '/'
    })
    vi.mocked(join).mockImplementation((dir: string) => `${dir}/package.json`)
    vi.mocked(existsSync).mockReturnValue(false)

    const originalCwd = process.cwd
    process.cwd = vi.fn(() => '/fallback')

    try {
      findProjectRoot()
      expect(existsSync).toHaveBeenCalledTimes(2)
    } finally {
      process.cwd = originalCwd
    }
  })
})
