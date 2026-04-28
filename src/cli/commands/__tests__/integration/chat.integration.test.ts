import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readdirSync } from 'fs'
import { startCommand } from '../../start'
import { chatCommand } from '../../chat'
import { setupContainer } from '@src/core/di/setup'
import { makeResultLines, buildClaudeCodeStub, makeTmpDir, buildTestConfig } from './helpers'
import { stderr } from '@src/utils/output'
import { UserCancelledError } from '@src/errors/userCancelledError'
import { ValidationError } from '@src/errors/validationError'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')

describe('chatCommand (integration)', () => {
  let dir: string
  let cleanup: () => void
  let sessionId: string

  beforeEach(async () => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit')
    })

    // Create prerequisite session so chatCommand has a valid sessionId to resolve
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
    it('spawnInteractive が呼ばれる', async () => {
      const stub = buildClaudeCodeStub([])
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await chatCommand(sessionId)

      expect(stub.spawnInteractive).toHaveBeenCalled()
    })
  })

  describe('error path', () => {
    // spawnInteractive is synchronous (returns void), so we use mockImplementation to throw
    function makeThrowingStub(err: Error): ReturnType<typeof buildClaudeCodeStub> {
      const stub = buildClaudeCodeStub([])
      ;(stub.spawnInteractive as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw err
      })
      return stub
    }

    it('UserCancelledError のとき process.exit(0) になる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new UserCancelledError()) }
      })

      await expect(chatCommand(sessionId)).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(0)
    })

    it('UserCancelledError のとき Cancelled. が stderr に出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new UserCancelledError()) }
      })

      await expect(chatCommand(sessionId)).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Cancelled.')
    })

    it('ValidationError のとき process.exit(1) になる', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new ValidationError('bad input')) }
      })

      await expect(chatCommand(sessionId)).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('ValidationError のとき Invalid arguments が stderr に出る', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(new ValidationError('bad input')) }
      })

      await expect(chatCommand(sessionId)).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Invalid arguments: bad input')
    })

    it('Generic Error のとき process.exit(1) になる', async () => {
      const err = new Error('spawn failed')
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(err) }
      })

      await expect(chatCommand(sessionId)).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('Generic Error のとき Failed to start chat session が stderr に出る', async () => {
      const err = new Error('spawn failed')
      setupContainer({
        config: buildTestConfig(dir),
        infras: { claudeCodeInfra: makeThrowingStub(err) }
      })

      await expect(chatCommand(sessionId)).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Failed to start chat session', err)
    })
  })
})
