import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { startCommand } from '@src/cli/commands/start'
import { setupContainer } from '@src/core/di/setup'
import {
  makeResultLines,
  makeToolResultLines,
  buildClaudeCodeStub,
  makeTmpDir,
  buildTestConfig
} from './helpers'
import { stderr } from '@src/utils/output'
import { printResponse, printStreamEvent } from '@src/cli/view/display'
import { confirmIfDuplicateName } from '@src/cli/prompt'
import { UserCancelledError } from '@src/errors/userCancelledError'
import { ValidationError } from '@src/errors/validationError'
import { RateLimitError } from '@src/errors/rateLimitError'
import type { Session } from '@src/types/session'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
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
    it('session JSON is created in tmpdir', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('done'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await startCommand('test task', { outputOnly: true })

      const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
      expect(files).toHaveLength(1)
    })

    it('session status becomes completed', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('done'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await startCommand('test task', { outputOnly: true })

      const [file] = readdirSync(dir).filter((f) => f.endsWith('.json'))
      const session = JSON.parse(readFileSync(join(dir, file), 'utf8')) as Session
      expect(session.metadata.status).toBe('completed')
    })

    it('task is passed to runClaude as prompt', async () => {
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

    it('procedure option is saved in session', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('done'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await startCommand('task', { outputOnly: true, procedure: 'meta-librarian/curate' })

      const session = ((): Session => {
        const [file] = readdirSync(dir).filter((f) => f.endsWith('.json'))
        return JSON.parse(readFileSync(join(dir, file), 'utf8')) as Session
      })()
      expect(session.procedure).toBe('meta-librarian/curate')
    })

    it('in streaming mode, printStreamEvent is called and silentThoughts is passed to printResponse', async () => {
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

    it("tool_use → tool_result is included in printResponse's response", async () => {
      const lines = makeToolResultLines(
        { id: 'tu-1', name: 'Bash', input: { command: 'ls' }, result: 'file.txt' },
        'done'
      )
      const stub = buildClaudeCodeStub(lines)
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await startCommand('task', { outputOnly: true })

      const response = vi.mocked(printResponse).mock.calls[0][0]
      expect(response.tool_history).toEqual([
        expect.objectContaining({ id: 'tu-1', name: 'Bash', result: 'file.txt' })
      ])
    })

    it('in streaming mode, printStreamEvent is called for tool_use/tool_result', async () => {
      const lines = makeToolResultLines(
        { id: 'tu-2', name: 'Read', input: { file_path: '/tmp/x' }, result: 'content' },
        'done'
      )
      const stub = buildClaudeCodeStub(lines)
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await startCommand('task', { outputOnly: false })

      const calls = vi.mocked(printStreamEvent).mock.calls.map(([e]) => e)
      expect(calls).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'tool_use', name: 'Read' }),
          expect.objectContaining({ type: 'tool_result', toolName: 'Read' })
        ])
      )
    })

    it('with name specified + outputOnly: false, confirmIfDuplicateName executes findByName callback', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('done'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })
      vi.mocked(confirmIfDuplicateName).mockImplementation(async (_name, findByName) => {
        await findByName(_name)
      })

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

    it('Generic Error results in process.exit(1) and Failed to start session', async () => {
      const err = new Error('spawn failed')
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(err) }
      })

      await expect(startCommand('task', { outputOnly: true })).rejects.toThrow('exit')
      expect(exitSpy).toHaveBeenCalledWith(1)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Failed to start session', err)
    })

    it('UserCancelledError results in process.exit(0) and Cancelled', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new UserCancelledError()) }
      })

      await expect(startCommand('task', { outputOnly: true })).rejects.toThrow('exit')
      expect(exitSpy).toHaveBeenCalledWith(0)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Cancelled.')
    })

    it('ValidationError results in process.exit(1) and Invalid arguments', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new ValidationError('bad input')) }
      })

      await expect(startCommand('task', { outputOnly: true })).rejects.toThrow('exit')
      expect(exitSpy).toHaveBeenCalledWith(1)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Invalid arguments: bad input')
    })

    it('RateLimitError(with resetInfo) shows message containing Resets', async () => {
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

    it('RateLimitError(without resetInfo) shows message without Resets', async () => {
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
