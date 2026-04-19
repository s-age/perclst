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

// Import mocked modules to set expectations
import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

describe('findProjectRoot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('finds package.json in the current file directory', () => {
    // fileURLToPath returns this file's path
    vi.mocked(fileURLToPath).mockReturnValue(
      '/home/user/project/src/infrastructures/projectRoot.ts'
    )

    // dirname returns the directory containing the file
    vi.mocked(dirname).mockImplementation((path: string) => {
      if (path === '/home/user/project/src/infrastructures/projectRoot.ts') {
        return '/home/user/project/src/infrastructures'
      }
      return path
    })

    // join constructs the package.json path
    vi.mocked(join).mockImplementation((dir: string) => `${dir}/package.json`)

    // package.json exists in current directory
    vi.mocked(existsSync).mockImplementation((path: string) => {
      return path === '/home/user/project/src/infrastructures/package.json'
    })

    const result = findProjectRoot()

    expect(result).toBe('/home/user/project/src/infrastructures')
    expect(existsSync).toHaveBeenCalledTimes(1)
    expect(fileURLToPath).toHaveBeenCalledTimes(1)
  })

  it('walks up one level to find package.json', () => {
    vi.mocked(fileURLToPath).mockReturnValue(
      '/home/user/project/src/infrastructures/projectRoot.ts'
    )

    // dirname walks up the directory tree
    vi.mocked(dirname).mockImplementation((path: string) => {
      const parts = path.split('/').filter(Boolean)
      return '/' + parts.slice(0, -1).join('/')
    })

    // join constructs paths
    vi.mocked(join).mockImplementation((dir: string) => `${dir}/package.json`)

    // package.json exists only at level 1
    vi.mocked(existsSync).mockImplementation((path: string) => {
      return path === '/home/user/project/src/package.json'
    })

    const result = findProjectRoot()

    expect(result).toBe('/home/user/project/src')
    expect(existsSync).toHaveBeenCalledTimes(2)
  })

  it('walks up multiple levels to find package.json', () => {
    vi.mocked(fileURLToPath).mockReturnValue('/home/user/project/src/lib/utils/helpers/file.ts')

    // dirname walks up the directory tree
    vi.mocked(dirname).mockImplementation((path: string) => {
      const parts = path.split('/').filter(Boolean)
      return '/' + parts.slice(0, -1).join('/')
    })

    // join constructs paths
    vi.mocked(join).mockImplementation((dir: string) => `${dir}/package.json`)

    // package.json exists only at project root
    vi.mocked(existsSync).mockImplementation((path: string) => {
      return path === '/home/user/project/package.json'
    })

    const result = findProjectRoot()

    expect(result).toBe('/home/user/project')
    expect(existsSync).toHaveBeenCalledTimes(5)
  })

  it('stops traversal at filesystem root and falls back to process.cwd()', () => {
    vi.mocked(fileURLToPath).mockReturnValue('/home/file.ts')

    // dirname stops at filesystem root
    vi.mocked(dirname).mockImplementation((path: string) => {
      const parts = path.split('/').filter(Boolean)
      if (parts.length <= 1) return '/' // filesystem root
      return '/' + parts.slice(0, -1).join('/')
    })

    // join constructs paths
    vi.mocked(join).mockImplementation((dir: string) => `${dir}/package.json`)

    // package.json never found
    vi.mocked(existsSync).mockReturnValue(false)

    const cwdResult = '/current/working/directory'
    const originalCwd = process.cwd
    process.cwd = vi.fn(() => cwdResult)

    try {
      const result = findProjectRoot()

      expect(result).toBe(cwdResult)
      expect(process.cwd).toHaveBeenCalled()
    } finally {
      process.cwd = originalCwd
    }
  })

  it('reaches max iteration limit and falls back to process.cwd()', () => {
    // deeply nested path that will exceed 8-iteration limit
    vi.mocked(fileURLToPath).mockReturnValue('/a/b/c/d/e/f/g/h/i/j/k/file.ts')

    // dirname walks up, but never returns the same value (prevents early termination)
    vi.mocked(dirname).mockImplementation((path: string) => {
      const parts = path.split('/').filter(Boolean)
      if (parts.length <= 1) return '/'
      return '/' + parts.slice(0, -1).join('/')
    })

    // join constructs paths
    vi.mocked(join).mockImplementation((dir: string) => `${dir}/package.json`)

    // package.json never found
    vi.mocked(existsSync).mockReturnValue(false)

    const cwdResult = '/fallback/cwd'
    const originalCwd = process.cwd
    process.cwd = vi.fn(() => cwdResult)

    try {
      const result = findProjectRoot()

      expect(result).toBe(cwdResult)
      // exactly 8 iterations (i = 0 to 7)
      expect(existsSync).toHaveBeenCalledTimes(8)
    } finally {
      process.cwd = originalCwd
    }
  })

  it('detects filesystem root and exits loop early', () => {
    vi.mocked(fileURLToPath).mockReturnValue('/a/file.ts')

    // dirname reaches root on second call, triggering parent === dir
    vi.mocked(dirname).mockImplementation((path: string) => {
      if (path === '/a/file.ts') return '/a'
      return '/' // second call returns root, triggering break
    })

    // join constructs paths
    vi.mocked(join).mockImplementation((dir: string) => `${dir}/package.json`)

    // package.json never found
    vi.mocked(existsSync).mockReturnValue(false)

    const cwdResult = '/fallback'
    const originalCwd = process.cwd
    process.cwd = vi.fn(() => cwdResult)

    try {
      const result = findProjectRoot()

      expect(result).toBe(cwdResult)
      // only 2 iterations before root detection breaks loop
      expect(existsSync).toHaveBeenCalledTimes(2)
    } finally {
      process.cwd = originalCwd
    }
  })
})
