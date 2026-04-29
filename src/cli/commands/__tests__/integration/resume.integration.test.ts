import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readdirSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { startCommand } from '../../start'
import { resumeCommand } from '../../resume'
import { setupContainer } from '@src/core/di/setup'
import { makeResultLines, buildClaudeCodeStub, makeTmpDir, buildTestConfig } from './helpers'
import { stderr } from '@src/utils/output'
import { UserCancelledError } from '@src/errors/userCancelledError'
import { ValidationError } from '@src/errors/validationError'
import { RateLimitError } from '@src/errors/rateLimitError'
import type { Session } from '@src/types/session'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')

describe('resumeCommand (integration)', () => {
  let dir: string
  let cleanup: () => void
  let sessionId: string

  beforeEach(async () => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit')
    })

    // Create a session with start before running resume test
    const startStub = buildClaudeCodeStub(makeResultLines('started'))
    setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: startStub } })
    await startCommand('initial task', { outputOnly: true })

    // Get the created session ID
    const [file] = readdirSync(dir).filter((f) => f.endsWith('.json'))
    sessionId = file.replace('.json', '')
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('Session file exists after resume', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('resumed'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await resumeCommand(sessionId, 'continue the work', { outputOnly: true })

      expect(existsSync(join(dir, `${sessionId}.json`))).toBe(true)
    })

    it('resume args are passed to runClaude', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('resumed'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await resumeCommand(sessionId, 'continue', { outputOnly: true })

      const [args] = (stub.runClaude as ReturnType<typeof vi.fn>).mock.calls[0] as [
        string[],
        ...unknown[]
      ]
      expect(args).toContain('--resume')
    })

    it('instruction is passed as prompt', async () => {
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

    it('When labels are specified, they are written to session', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('resumed'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await resumeCommand(sessionId, 'continue', { outputOnly: true, labels: ['foo', 'bar'] })

      const session = JSON.parse(readFileSync(join(dir, `${sessionId}.json`), 'utf8')) as Session
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

    it('Non-existent sessionId results in process.exit(1)', async () => {
      const stub = buildClaudeCodeStub([])
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await expect(
        resumeCommand('nonexistent-id', 'continue', { outputOnly: true })
      ).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('Generic Error results in process.exit(1) and Failed to resume session', async () => {
      const err = new Error('spawn failed')
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(err) }
      })

      await expect(resumeCommand(sessionId, 'x', { outputOnly: true })).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Failed to resume session', err)
    })

    it('UserCancelledError results in process.exit(0) and Cancelled', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new UserCancelledError()) }
      })

      await expect(resumeCommand(sessionId, 'x', { outputOnly: true })).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(0)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Cancelled.')
    })

    it('ValidationError results in process.exit(1) and Invalid arguments', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new ValidationError('bad input')) }
      })

      await expect(resumeCommand(sessionId, 'x', { outputOnly: true })).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Invalid arguments: bad input')
    })

    it('RateLimitError (with resetInfo) outputs message containing Resets', async () => {
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

    it('RateLimitError (without resetInfo) outputs message without Resets', async () => {
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
