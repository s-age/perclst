import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readdirSync } from 'fs'
import { startCommand } from '../../start'
import { forkCommand } from '../../fork'
import { setupContainer } from '@src/core/di/setup'
import { makeResultLines, buildClaudeCodeStub, makeTmpDir, buildTestConfig } from './helpers'
import { stdout, stderr } from '@src/utils/output'
import { ValidationError } from '@src/errors/validationError'
import { RateLimitError } from '@src/errors/rateLimitError'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')

describe('forkCommand (integration)', () => {
  let dir: string
  let cleanup: () => void
  let sessionId: string

  beforeEach(async () => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit')
    })

    // fork は既存セッションを必要とするため startCommand で先に作成する
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
    it('フォーク後に新セッション JSON ファイルが増える（計 2 ファイル）', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('forked'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await forkCommand(sessionId, 'forked task', { outputOnly: true })

      expect(readdirSync(dir).filter((f) => f.endsWith('.json'))).toHaveLength(2)
    })

    it('buildArgs に fork action が渡される', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('forked'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await forkCommand(sessionId, 'forked task', { outputOnly: true })

      const [action] = (stub.buildArgs as ReturnType<typeof vi.fn>).mock.calls[0] as [
        { type: string }
      ]
      expect(action.type).toBe('fork')
    })

    it('prompt が runClaude に渡される', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('forked'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await forkCommand(sessionId, 'forked task', { outputOnly: true })

      const [, prompt] = (stub.runClaude as ReturnType<typeof vi.fn>).mock.calls[0] as [
        string[],
        string,
        ...unknown[]
      ]
      expect(prompt).toBe('forked task')
    })

    it('stdout.print に Session forked: が含まれる', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('forked'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await forkCommand(sessionId, 'forked task', { outputOnly: true })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(
        expect.stringContaining('Session forked:')
      )
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

    it('ValidationError のとき process.exit(1) と Invalid arguments が出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new ValidationError('bad input')) }
      })

      await expect(forkCommand(sessionId, 'x', { outputOnly: true })).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Invalid arguments: bad input')
    })

    it('RateLimitError(resetInfo あり) のとき Resets が含まれるメッセージが出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError('2026-12-31')) }
      })

      await expect(forkCommand(sessionId, 'x', { outputOnly: true })).rejects.toThrow('exit')
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

      await expect(forkCommand(sessionId, 'x', { outputOnly: true })).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Claude usage limit reached. Please wait and try again.'
      )
    })

    it('Generic Error のとき process.exit(1) と Failed to fork session が出る', async () => {
      const err = new Error('spawn failed')
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(err) }
      })

      await expect(forkCommand(sessionId, 'x', { outputOnly: true })).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Failed to fork session', err)
    })
  })
})
