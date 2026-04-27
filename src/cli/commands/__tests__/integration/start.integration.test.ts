import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readdirSync } from 'fs'
import { readJson } from '@src/infrastructures/fs'
import { join } from 'path'
import { startCommand } from '../../start'
import { setupContainer } from '@src/core/di/setup'
import { makeResultLines, buildClaudeCodeStub, makeTmpDir, buildTestConfig } from './helpers'
import { stderr } from '@src/utils/output'
import { printResponse, printStreamEvent } from '@src/cli/display'
import { confirmIfDuplicateName } from '@src/cli/prompt'
import { UserCancelledError } from '@src/errors/userCancelledError'
import { ValidationError } from '@src/errors/validationError'
import { RateLimitError } from '@src/errors/rateLimitError'
import type { Session } from '@src/types/session'

vi.mock('@src/utils/output')
vi.mock('@src/cli/display')
vi.mock('@src/cli/prompt')

describe('startCommand (integration)', () => {
  let dir: string
  let cleanup: () => void
  let exitSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit')
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('session JSON が tmpdir に作成される', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('done'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await startCommand('test task', { outputOnly: true })

      const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
      expect(files).toHaveLength(1)
    })

    it('session の status が active になる', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('done'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await startCommand('test task', { outputOnly: true })

      const [file] = readdirSync(dir).filter((f) => f.endsWith('.json'))
      const session = readJson<Session>(join(dir, file))
      expect(session.metadata.status).toBe('active')
    })

    it('runClaude に task が prompt として渡される', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('done'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await startCommand('my task text', { outputOnly: true })

      const [, prompt] = (stub.runClaude as ReturnType<typeof vi.fn>).mock.calls[0] as [
        string[],
        string,
        ...unknown[]
      ]
      expect(prompt).toBe('my task text')
    })

    it('procedure オプションが session に保存される', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('done'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await startCommand('task', { outputOnly: true, procedure: 'meta-librarian/curate' })

      const session = ((): Session => {
        const [file] = readdirSync(dir).filter((f) => f.endsWith('.json'))
        return readJson<Session>(join(dir, file))
      })()
      expect(session.procedure).toBe('meta-librarian/curate')
    })

    it('streaming モードで printStreamEvent が呼ばれ printResponse に silentThoughts が渡る', async () => {
      const thinkingLine = JSON.stringify({
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [{ type: 'thinking', thinking: 'processing' }],
          usage: { input_tokens: 10, output_tokens: 5 }
        }
      })
      const stub = buildClaudeCodeStub([thinkingLine, ...makeResultLines('done')])
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await startCommand('test task', { outputOnly: false })

      expect(vi.mocked(printStreamEvent)).toHaveBeenCalled()
      expect(vi.mocked(printResponse)).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ silentThoughts: true, silentToolResponse: true }),
        undefined,
        expect.objectContaining({ sessionId: expect.any(String) })
      )
    })

    it('name 指定 + outputOnly: false で confirmIfDuplicateName が呼ばれる', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('done'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await startCommand('test task', { outputOnly: false, name: 'my-session' })

      expect(vi.mocked(confirmIfDuplicateName)).toHaveBeenCalledWith(
        'my-session',
        expect.any(Function),
        undefined,
        !!process.stdin.isTTY
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

    it('Generic Error のとき process.exit(1) と Failed to start session が出る', async () => {
      const err = new Error('spawn failed')
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(err) }
      })

      await expect(startCommand('task', { outputOnly: true })).rejects.toThrow('exit')
      expect(exitSpy).toHaveBeenCalledWith(1)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Failed to start session', err)
    })

    it('UserCancelledError のとき process.exit(0) と Cancelled が出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new UserCancelledError()) }
      })

      await expect(startCommand('task', { outputOnly: true })).rejects.toThrow('exit')
      expect(exitSpy).toHaveBeenCalledWith(0)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Cancelled.')
    })

    it('ValidationError のとき process.exit(1) と Invalid arguments が出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new ValidationError('bad input')) }
      })

      await expect(startCommand('task', { outputOnly: true })).rejects.toThrow('exit')
      expect(exitSpy).toHaveBeenCalledWith(1)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Invalid arguments: bad input')
    })

    it('RateLimitError(resetInfo あり) のとき Resets が含まれるメッセージが出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError('2026-12-31')) }
      })

      await expect(startCommand('task', { outputOnly: true })).rejects.toThrow('exit')
      expect(exitSpy).toHaveBeenCalledWith(1)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Claude usage limit reached. Resets: 2026-12-31 Please wait and try again.'
      )
    })

    it('RateLimitError(resetInfo なし) のとき Resets なしのメッセージが出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new RateLimitError()) }
      })

      await expect(startCommand('task', { outputOnly: true })).rejects.toThrow('exit')
      expect(exitSpy).toHaveBeenCalledWith(1)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Claude usage limit reached. Please wait and try again.'
      )
    })
  })
})
