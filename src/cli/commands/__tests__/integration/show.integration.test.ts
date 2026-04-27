import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readdirSync } from 'fs'
import { startCommand } from '../../start'
import { showCommand } from '../../show'
import { setupContainer } from '@src/core/di/setup'
import { buildClaudeCodeStub, makeTmpDir, buildTestConfig, makeResultLines } from './helpers'
import { stdout } from '@src/utils/output'
import { printShowText } from '@src/cli/view/showDisplay'
import type { IClaudeSessionRepository } from '@src/repositories/ports/analysis'
import type { ClaudeSessionData } from '@src/types/analysis'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')
vi.mock('@src/cli/view/showDisplay')

const emptyTokens: ClaudeSessionData['tokens'] = {
  totalInput: 0,
  totalOutput: 0,
  totalCacheRead: 0,
  totalCacheCreation: 0,
  contextWindow: 0
}

function buildClaudeSessionRepoStub(data: ClaudeSessionData): IClaudeSessionRepository {
  return {
    findEncodedDirBySessionId: vi.fn(() => ''),
    decodeWorkingDir: vi.fn(() => ({ path: null, ambiguous: false })),
    validateSessionAtDir: vi.fn(),
    readSession: vi.fn(() => data),
    scanSessionStats: vi.fn(() => ({ apiCalls: 0, toolCalls: 0, tokens: emptyTokens })),
    getAssistantTurns: vi.fn(() => [])
  }
}

describe('showCommand (integration)', () => {
  let dir: string
  let cleanup: () => void
  let sessionId: string

  beforeEach(async () => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit')
    })

    const startStub = buildClaudeCodeStub(makeResultLines('started'))
    setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: startStub } })
    await startCommand('initial task', { outputOnly: true })

    const [file] = readdirSync(dir).filter((f) => f.endsWith('.json'))
    sessionId = file.replace('.json', '')
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('printShowText is called with the session', async () => {
      const claudeSessionRepo = buildClaudeSessionRepoStub({ turns: [], tokens: emptyTokens })
      setupContainer({ config: buildTestConfig(dir), repos: { claudeSessionRepo } })

      await showCommand(sessionId, {})

      expect(vi.mocked(printShowText)).toHaveBeenCalledWith(
        expect.objectContaining({ id: sessionId })
      )
    })

    it('stdout.print outputs "(no turns)" when turns are empty', async () => {
      const claudeSessionRepo = buildClaudeSessionRepoStub({ turns: [], tokens: emptyTokens })
      setupContainer({ config: buildTestConfig(dir), repos: { claudeSessionRepo } })

      await showCommand(sessionId, {})

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith('\n(no turns)')
    })

    it('--format json: stdout.print receives a JSON string containing the session id', async () => {
      const claudeSessionRepo = buildClaudeSessionRepoStub({ turns: [], tokens: emptyTokens })
      setupContainer({ config: buildTestConfig(dir), repos: { claudeSessionRepo } })

      await showCommand(sessionId, { format: 'json' })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(expect.stringContaining(sessionId))
    })
  })

  describe('error path', () => {
    it('nonexistent sessionId causes process.exit(1)', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await expect(showCommand('nonexistent-id', {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })
  })
})
