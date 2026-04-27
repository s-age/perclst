import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { startCommand } from '../../start'
import { resumeCommand } from '../../resume'
import { setupContainer } from '@src/core/di/setup'
import { makeResultLines, buildClaudeCodeStub, makeTmpDir, buildTestConfig } from './helpers'
import { stderr } from '@src/utils/output'
import { readJson } from '@src/infrastructures/fs'
import { UserCancelledError } from '@src/errors/userCancelledError'
import { ValidationError } from '@src/errors/validationError'
import { RateLimitError } from '@src/errors/rateLimitError'
import type { Session } from '@src/types/session'

vi.mock('@src/utils/output')
vi.mock('@src/cli/display')
vi.mock('@src/cli/prompt')

describe('resumeCommand (E2E)', () => {
  let dir: string
  let cleanup: () => void
  let sessionId: string

  beforeEach(async () => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit')
    })

    // start でセッションを作成してから resume テストを行う
    const startStub = buildClaudeCodeStub(makeResultLines('started'))
    setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: startStub } })
    await startCommand('initial task', { outputOnly: true })

    // 作成された session ID を取得
    const [file] = readdirSync(dir).filter((f) => f.endsWith('.json'))
    sessionId = file.replace('.json', '')
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('resume 後も session ファイルが存在する', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('resumed'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await resumeCommand(sessionId, 'continue the work', { outputOnly: true })

      expect(existsSync(join(dir, `${sessionId}.json`))).toBe(true)
    })

    it('buildArgs に resume action が渡される', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('resumed'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await resumeCommand(sessionId, 'continue', { outputOnly: true })

      // dispatch が resume action を正しく構築したことを buildArgs への入力で検証する
      const [action] = (stub.buildArgs as ReturnType<typeof vi.fn>).mock.calls[0] as [
        { type: string }
      ]
      expect(action.type).toBe('resume')
    })

    it('instruction が prompt として渡される', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('resumed'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await resumeCommand(sessionId, 'do the next step', { outputOnly: true })

      const [, prompt] = (stub.runClaude as ReturnType<typeof vi.fn>).mock.calls[0] as [
        string[],
        string,
        ...unknown[]
      ]
      expect(prompt).toBe('do the next step')
    })

    it('labels が指定されると session に書き込まれる', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('resumed'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await resumeCommand(sessionId, 'continue', { outputOnly: true, labels: ['foo', 'bar'] })

      const session = readJson<Session>(join(dir, `${sessionId}.json`))
      expect(session.metadata.labels).toEqual(['foo', 'bar'])
    })
  })

  describe('error path', () => {
    function makeThrowingStub(err: Error): ReturnType<typeof buildClaudeCodeStub> {
      const stub = buildClaudeCodeStub([])
      ;(stub.runClaude as ReturnType<typeof vi.fn>).mockImplementation(
        async function* (): AsyncGenerator<string> {
          yield* [] as string[]
          throw err
        }
      )
      return stub
    }

    it('存在しない sessionId は process.exit(1) になる', async () => {
      const stub = buildClaudeCodeStub([])
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await expect(
        resumeCommand('nonexistent-id', 'continue', { outputOnly: true })
      ).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('Generic Error のとき process.exit(1) と Failed to resume session が出る', async () => {
      const err = new Error('spawn failed')
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(err) }
      })

      await expect(resumeCommand(sessionId, 'x', { outputOnly: true })).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Failed to resume session', err)
    })

    it('UserCancelledError のとき process.exit(0) と Cancelled が出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new UserCancelledError()) }
      })

      await expect(resumeCommand(sessionId, 'x', { outputOnly: true })).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(0)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Cancelled.')
    })

    it('ValidationError のとき process.exit(1) と Invalid arguments が出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new ValidationError('bad input')) }
      })

      await expect(resumeCommand(sessionId, 'x', { outputOnly: true })).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Invalid arguments: bad input')
    })

    it('RateLimitError(resetInfo あり) のとき Resets が含まれるメッセージが出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError('2026-12-31')) }
      })

      await expect(resumeCommand(sessionId, 'x', { outputOnly: true })).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Claude usage limit reached. Resets: 2026-12-31 Please wait and try again.'
      )
    })

    it('RateLimitError(resetInfo なし) のとき Resets なしのメッセージが出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError()) }
      })

      await expect(resumeCommand(sessionId, 'x', { outputOnly: true })).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Claude usage limit reached. Please wait and try again.'
      )
    })
  })
})
