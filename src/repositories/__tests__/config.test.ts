import { vi, describe, it, expect, beforeEach } from 'vitest'
import { fileExists, readJson, homeDir, currentWorkingDir } from '@src/infrastructures/fs'
import { DEFAULT_CONFIG } from '@src/constants/config'
import { loadConfig, resolveSessionsDir, resolveKnowledgeDir } from '../config'

vi.mock('@src/infrastructures/fs', () => ({
  fileExists: vi.fn(),
  readJson: vi.fn(),
  homeDir: vi.fn(),
  currentWorkingDir: vi.fn()
}))

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

const mockFileExists = vi.mocked(fileExists)
const mockReadJson = vi.mocked(readJson)
const mockHomeDir = vi.mocked(homeDir)
const mockCurrentWorkingDir = vi.mocked(currentWorkingDir)

// ─── loadConfig ──────────────────────────────────────────────────────────────
// loadConfig calls loadFromPath (internal) twice: local path first, then global.
// Spread order: { ...DEFAULT_CONFIG, ...globalConfig, ...localConfig } → local wins.

describe('loadConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockHomeDir.mockReturnValue('/home/user')
    mockFileExists.mockReturnValue(false)
  })

  it('returns DEFAULT_CONFIG when neither config file exists', () => {
    const result = loadConfig()
    expect(result).toEqual(DEFAULT_CONFIG)
  })

  it('merges global config over DEFAULT_CONFIG when only global file exists', () => {
    mockFileExists.mockImplementation((p: string) => p.startsWith('/home/user'))
    mockReadJson.mockReturnValue({ model: 'claude-opus-4-5' })
    const result = loadConfig()
    expect(result.model).toBe('claude-opus-4-5')
  })

  it('merges local config over DEFAULT_CONFIG when only local file exists', () => {
    mockFileExists.mockImplementation((p: string) => !p.startsWith('/home/user'))
    mockReadJson.mockReturnValue({ model: 'claude-haiku-4-5' })
    const result = loadConfig()
    expect(result.model).toBe('claude-haiku-4-5')
  })

  it('local config takes precedence over global config when both files exist', () => {
    mockFileExists.mockReturnValue(true)
    // loadFromPath reads local first, then global
    mockReadJson
      .mockReturnValueOnce({ model: 'claude-haiku-4-5' }) // local (1st call)
      .mockReturnValueOnce({ model: 'claude-opus-4-5' }) // global (2nd call)
    const result = loadConfig()
    expect(result.model).toBe('claude-haiku-4-5')
  })

  it('preserves DEFAULT_CONFIG fields not overridden by loaded config', () => {
    mockFileExists.mockImplementation((p: string) => !p.startsWith('/home/user'))
    mockReadJson.mockReturnValue({ model: 'claude-haiku-4-5' })
    const result = loadConfig()
    expect(result.sessions_dir).toBe(DEFAULT_CONFIG.sessions_dir)
  })

  it('falls back to DEFAULT_CONFIG when local readJson throws', () => {
    mockFileExists.mockImplementation((p: string) => !p.startsWith('/home/user'))
    mockReadJson.mockImplementation(() => {
      throw new Error('parse error')
    })
    const result = loadConfig()
    expect(result.model).toBe(DEFAULT_CONFIG.model)
  })

  it('falls back to DEFAULT_CONFIG when global readJson throws', () => {
    mockFileExists.mockImplementation((p: string) => p.startsWith('/home/user'))
    mockReadJson.mockImplementation(() => {
      throw new Error('bad json')
    })
    const result = loadConfig()
    expect(result.model).toBe(DEFAULT_CONFIG.model)
  })

  it('emits a console.warn when readJson throws', () => {
    mockFileExists.mockImplementation((p: string) => !p.startsWith('/home/user'))
    mockReadJson.mockImplementation(() => {
      throw new Error('parse error')
    })
    loadConfig()
    expect(console.warn).toHaveBeenCalled()
  })
})

// ─── resolveSessionsDir ──────────────────────────────────────────────────────
// Also exercises the three resolvePath branches (absolute / tilde / relative).

describe('resolveSessionsDir', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHomeDir.mockReturnValue('/home/user')
    mockCurrentWorkingDir.mockReturnValue('/project')
  })

  it('returns an absolute sessions_dir path unchanged', () => {
    const result = resolveSessionsDir({ sessions_dir: '/var/data/sessions' })
    expect(result).toBe('/var/data/sessions')
  })

  it('expands leading ~ in sessions_dir using homeDir()', () => {
    const result = resolveSessionsDir({ sessions_dir: '~/my/sessions' })
    expect(result).toBe('/home/user/my/sessions')
  })

  it('joins a relative sessions_dir with currentWorkingDir()', () => {
    const result = resolveSessionsDir({ sessions_dir: 'local/sessions' })
    expect(result).toBe('/project/local/sessions')
  })

  it('falls back to DEFAULT_CONFIG.sessions_dir when sessions_dir is not set', () => {
    // DEFAULT_CONFIG.sessions_dir is '~/.perclst/sessions' → expands with homeDir()
    const result = resolveSessionsDir({})
    expect(result).toBe('/home/user/.perclst/sessions')
  })
})

// ─── resolveKnowledgeDir ─────────────────────────────────────────────────────

describe('resolveKnowledgeDir', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCurrentWorkingDir.mockReturnValue('/project')
  })

  it('returns the knowledge directory under the current working directory', () => {
    const result = resolveKnowledgeDir()
    expect(result).toBe('/project/knowledge')
  })
})
