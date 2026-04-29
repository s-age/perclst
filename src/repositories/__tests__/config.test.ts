import { vi, describe, it, expect, beforeEach } from 'vitest'
import { DEFAULT_CONFIG } from '@src/constants/config'
import type { FsInfra } from '@src/infrastructures/fs'
import { loadConfig, resolveSessionsDir, resolveKnowledgeDir } from '../config'

vi.mock('@src/constants/config', () => ({
  DEFAULT_CONFIG: {
    sessions_dir: '~/.perclst/sessions',
    logs_dir: '~/.perclst/logs',
    model: 'claude-sonnet-4-6',
    api_key_env: 'ANTHROPIC_API_KEY',
    allowed_tools: [],
    disallowed_tools: [],
    display: { header_color: '#D97757', no_color: false },
    limits: { max_messages: -1, max_context_tokens: -1 }
  },
  CONFIG_DIR_NAME: '.perclst'
}))

function createMockFs(overrides?: Partial<Record<keyof FsInfra, unknown>>): FsInfra {
  return {
    fileExists: vi.fn().mockReturnValue(false),
    readText: vi.fn(),
    homeDir: vi.fn().mockReturnValue('/home/user'),
    currentWorkingDir: vi.fn().mockReturnValue('/project'),
    ...overrides
  } as unknown as FsInfra
}

// ─── loadConfig ──────────────────────────────────────────────────────────────
// loadConfig calls loadFromPath (internal) twice: local path first, then global.
// Spread order: { ...DEFAULT_CONFIG, ...globalConfig, ...localConfig } → local wins.

describe('loadConfig', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('returns DEFAULT_CONFIG when neither config file exists', () => {
    const fs = createMockFs()
    const result = loadConfig(fs)
    expect(result).toEqual(DEFAULT_CONFIG)
  })

  it('merges global config over DEFAULT_CONFIG when only global file exists', () => {
    const fs = createMockFs({
      fileExists: vi.fn().mockImplementation((p: string) => p.startsWith('/home/user')),
      readText: vi.fn().mockReturnValue(JSON.stringify({ model: 'claude-opus-4-5' }))
    })
    const result = loadConfig(fs)
    expect(result.model).toBe('claude-opus-4-5')
  })

  it('merges local config over DEFAULT_CONFIG when only local file exists', () => {
    const fs = createMockFs({
      fileExists: vi.fn().mockImplementation((p: string) => !p.startsWith('/home/user')),
      readText: vi.fn().mockReturnValue(JSON.stringify({ model: 'claude-haiku-4-5' }))
    })
    const result = loadConfig(fs)
    expect(result.model).toBe('claude-haiku-4-5')
  })

  it('local config takes precedence over global config when both files exist', () => {
    const fs = createMockFs({
      fileExists: vi.fn().mockReturnValue(true),
      readText: vi
        .fn()
        .mockReturnValueOnce(JSON.stringify({ model: 'claude-haiku-4-5' })) // local (1st call)
        .mockReturnValueOnce(JSON.stringify({ model: 'claude-opus-4-5' })) // global (2nd call)
    })
    const result = loadConfig(fs)
    expect(result.model).toBe('claude-haiku-4-5')
  })

  it('preserves DEFAULT_CONFIG fields not overridden by loaded config', () => {
    const fs = createMockFs({
      fileExists: vi.fn().mockImplementation((p: string) => !p.startsWith('/home/user')),
      readText: vi.fn().mockReturnValue(JSON.stringify({ model: 'claude-haiku-4-5' }))
    })
    const result = loadConfig(fs)
    expect(result.sessions_dir).toBe(DEFAULT_CONFIG.sessions_dir)
  })

  it('falls back to DEFAULT_CONFIG when readText throws', () => {
    const fs = createMockFs({
      fileExists: vi.fn().mockImplementation((p: string) => !p.startsWith('/home/user')),
      readText: vi.fn().mockImplementation(() => {
        throw new Error('parse error')
      })
    })
    const result = loadConfig(fs)
    expect(result.model).toBe(DEFAULT_CONFIG.model)
  })

  it('falls back to DEFAULT_CONFIG when global readText throws', () => {
    const fs = createMockFs({
      fileExists: vi.fn().mockImplementation((p: string) => p.startsWith('/home/user')),
      readText: vi.fn().mockImplementation(() => {
        throw new Error('bad json')
      })
    })
    const result = loadConfig(fs)
    expect(result.model).toBe(DEFAULT_CONFIG.model)
  })

  it('emits a console.warn when readText throws', () => {
    const fs = createMockFs({
      fileExists: vi.fn().mockImplementation((p: string) => !p.startsWith('/home/user')),
      readText: vi.fn().mockImplementation(() => {
        throw new Error('parse error')
      })
    })
    loadConfig(fs)
    expect(console.warn).toHaveBeenCalled()
  })
})

// ─── resolveSessionsDir ──────────────────────────────────────────────────────
// Also exercises the three resolvePath branches (absolute / tilde / relative).

describe('resolveSessionsDir', () => {
  it('returns an absolute sessions_dir path unchanged', () => {
    const fs = createMockFs()
    const result = resolveSessionsDir(fs, { sessions_dir: '/var/data/sessions' })
    expect(result).toBe('/var/data/sessions')
  })

  it('expands leading ~ in sessions_dir using homeDir()', () => {
    const fs = createMockFs()
    const result = resolveSessionsDir(fs, { sessions_dir: '~/my/sessions' })
    expect(result).toBe('/home/user/my/sessions')
  })

  it('joins a relative sessions_dir with currentWorkingDir()', () => {
    const fs = createMockFs()
    const result = resolveSessionsDir(fs, { sessions_dir: 'local/sessions' })
    expect(result).toBe('/project/local/sessions')
  })

  it('falls back to DEFAULT_CONFIG.sessions_dir when sessions_dir is not set', () => {
    const fs = createMockFs()
    // DEFAULT_CONFIG.sessions_dir is '~/.perclst/sessions' → expands with homeDir()
    const result = resolveSessionsDir(fs, {})
    expect(result).toBe('/home/user/.perclst/sessions')
  })
})

// ─── resolveKnowledgeDir ─────────────────────────────────────────────────────

describe('resolveKnowledgeDir', () => {
  it('returns the knowledge directory under the current working directory', () => {
    const fs = createMockFs()
    const result = resolveKnowledgeDir(fs)
    expect(result).toBe('/project/knowledge')
  })
})
