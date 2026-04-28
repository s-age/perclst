import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readdirSync } from 'fs'
import { startCommand } from '../../start'
import { analyzeCommand } from '../../analyze'
import { setupContainer } from '@src/core/di/setup'
import { makeResultLines, buildClaudeCodeStub, makeTmpDir, buildTestConfig } from './helpers'
import { stderr } from '@src/utils/output'
import {
  printAnalyzeText,
  printAnalyzeJson,
  printAnalyzeDetail
} from '@src/cli/view/analyzeDisplay'
import type { IClaudeSessionRepository } from '@src/repositories/ports/analysis'
import type { ClaudeSessionData } from '@src/types/analysis'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')
vi.mock('@src/cli/view/analyzeDisplay')

function buildClaudeSessionRepoMock(): IClaudeSessionRepository {
  const emptyData: ClaudeSessionData = {
    turns: [],
    tokens: {
      totalInput: 0,
      totalOutput: 0,
      totalCacheRead: 0,
      totalCacheCreation: 0,
      contextWindow: 0
    }
  }
  return {
    readSession: vi.fn(() => emptyData),
    findEncodedDirBySessionId: vi.fn(() => ''),
    decodeWorkingDir: vi.fn(() => ({ path: null, ambiguous: false })),
    validateSessionAtDir: vi.fn(),
    scanSessionStats: vi.fn(() => ({
      apiCalls: 0,
      toolCalls: 0,
      tokens: {
        totalInput: 0,
        totalOutput: 0,
        totalCacheRead: 0,
        totalCacheCreation: 0,
        contextWindow: 0
      }
    })),
    getAssistantTurns: vi.fn(() => [])
  } as unknown as IClaudeSessionRepository
}

describe('analyzeCommand (integration)', () => {
  let dir: string
  let cleanup: () => void
  let sessionId: string

  beforeEach(async () => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit')
    })

    // 前提セッションを startCommand で作成する
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
    it('デフォルト（text 形式）で printAnalyzeText が呼ばれる', async () => {
      const claudeSessionRepo = buildClaudeSessionRepoMock()
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: buildClaudeCodeStub([]) },
        repos: { claudeSessionRepo }
      })

      await analyzeCommand(sessionId, {})

      expect(vi.mocked(printAnalyzeText)).toHaveBeenCalled()
    })

    it('--format json で printAnalyzeJson が呼ばれる', async () => {
      const claudeSessionRepo = buildClaudeSessionRepoMock()
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: buildClaudeCodeStub([]) },
        repos: { claudeSessionRepo }
      })

      await analyzeCommand(sessionId, { format: 'json' })

      expect(vi.mocked(printAnalyzeJson)).toHaveBeenCalled()
    })

    it('--printDetail で printAnalyzeDetail が呼ばれる', async () => {
      const claudeSessionRepo = buildClaudeSessionRepoMock()
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: buildClaudeCodeStub([]) },
        repos: { claudeSessionRepo }
      })

      await analyzeCommand(sessionId, { printDetail: true })

      expect(vi.mocked(printAnalyzeDetail)).toHaveBeenCalled()
    })
  })

  describe('error path', () => {
    it('存在しない sessionId は process.exit(1) になる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: buildClaudeCodeStub([]) }
      })

      await expect(analyzeCommand('nonexistent-id', {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('ValidationError のとき process.exit(1) と Invalid arguments が出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: buildClaudeCodeStub([]) }
      })

      await expect(analyzeCommand(sessionId, { format: 'invalid' })).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        expect.stringContaining('Invalid arguments:')
      )
    })
  })
})
