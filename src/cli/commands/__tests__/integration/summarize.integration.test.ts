import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { startCommand } from '../../start'
import { summarizeCommand } from '../../summarize'
import { setupContainer } from '@src/core/di/setup'
import { makeResultLines, buildClaudeCodeStub, makeTmpDir, buildTestConfig } from './helpers'
import { stdout, stderr } from '@src/utils/output'
import { printSummarizeTable, printSummarizeJson } from '@src/cli/view/summarizeDisplay'
import type { IClaudeSessionRepository } from '@src/repositories/ports/analysis'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')
vi.mock('@src/cli/view/summarizeDisplay')

function buildClaudeSessionRepoMock(): IClaudeSessionRepository {
  return {
    readSession: vi.fn(),
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

describe('summarizeCommand (integration)', () => {
  let dir: string
  let cleanup: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit')
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('セッションなし → stdout.print("No sessions found") が呼ばれる', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await summarizeCommand({})

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith('No sessions found')
    })

    it('text 形式で printSummarizeTable が呼ばれる', async () => {
      const startStub = buildClaudeCodeStub(makeResultLines('started'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: startStub } })
      await startCommand('initial task', { outputOnly: true })

      const claudeSessionRepo = buildClaudeSessionRepoMock()
      setupContainer({ config: buildTestConfig(dir), repos: { claudeSessionRepo } })

      await summarizeCommand({})

      expect(vi.mocked(printSummarizeTable)).toHaveBeenCalled()
    })

    it('--format json で printSummarizeJson が呼ばれる', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await summarizeCommand({ format: 'json' })

      expect(vi.mocked(printSummarizeJson)).toHaveBeenCalled()
    })

    it('--label フィルタで一致するセッションが printSummarizeTable に渡る', async () => {
      const startStub = buildClaudeCodeStub(makeResultLines('started'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: startStub } })
      await startCommand('initial task', { outputOnly: true, labels: ['keep'] })

      const claudeSessionRepo = buildClaudeSessionRepoMock()
      setupContainer({ config: buildTestConfig(dir), repos: { claudeSessionRepo } })

      await summarizeCommand({ label: 'keep' })

      expect(vi.mocked(printSummarizeTable)).toHaveBeenCalled()
    })

    it('--like フィルタで名前一致するセッションが printSummarizeTable に渡る', async () => {
      const startStub = buildClaudeCodeStub(makeResultLines('started'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: startStub } })
      await startCommand('initial task', { outputOnly: true, name: 'my-special-session' })

      const claudeSessionRepo = buildClaudeSessionRepoMock()
      setupContainer({ config: buildTestConfig(dir), repos: { claudeSessionRepo } })

      await summarizeCommand({ like: 'my-special' })

      expect(vi.mocked(printSummarizeTable)).toHaveBeenCalled()
    })
  })

  describe('error path', () => {
    it('ValidationError のとき process.exit(1) と Failed to summarize sessions が出る', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await expect(summarizeCommand({ format: 'invalid' })).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Failed to summarize sessions',
        expect.any(Error)
      )
    })
  })
})
