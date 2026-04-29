import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { inspectCommand } from '@src/cli/commands/inspect'
import { setupContainer } from '@src/core/di/setup'
import {
  makeResultLines,
  buildClaudeCodeStub,
  buildGitInfraStub,
  makeTmpDir,
  buildTestConfig
} from './helpers'
import { stdout, stderr } from '@src/utils/output'
import { printResponse } from '@src/cli/view/display'
import { RateLimitError } from '@src/errors/rateLimitError'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')

describe('inspectCommand (integration)', () => {
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
    it('printResponse is called when diff exists', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('inspection done'))
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: stub,
          gitInfra: buildGitInfraStub({ diff: 'diff --git a/foo.ts b/foo.ts' })
        }
      })

      await inspectCommand('main', 'HEAD', {})

      expect(vi.mocked(printResponse)).toHaveBeenCalled()
    })

    it('No differences found is output when there is no diff', async () => {
      const stub = buildClaudeCodeStub([])
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: stub,
          gitInfra: buildGitInfraStub()
        }
      })

      await inspectCommand('main', 'HEAD', {})

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(
        'No differences found between the specified refs.'
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

    it('process.exit is called with 1 when gitRef is invalid', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await expect(inspectCommand('!@#invalid', 'HEAD', {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('Invalid arguments appears in stderr when gitRef is invalid', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await expect(inspectCommand('!@#invalid', 'HEAD', {})).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        expect.stringContaining('Invalid arguments:')
      )
    })

    it('process.exit is called with 1 when Generic Error occurs', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: makeThrowingStub(new Error('spawn failed')),
          gitInfra: buildGitInfraStub({ diff: 'diff content' })
        }
      })

      await expect(inspectCommand('main', 'HEAD', {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('Failed to run inspect appears in stderr when Generic Error occurs', async () => {
      const err = new Error('spawn failed')
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: makeThrowingStub(err),
          gitInfra: buildGitInfraStub({ diff: 'diff content' })
        }
      })

      await expect(inspectCommand('main', 'HEAD', {})).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Failed to run inspect', err)
    })

    it('process.exit is called with 1 when RateLimitError has resetInfo', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: makeThrowingStub(new RateLimitError('2026-12-31')),
          gitInfra: buildGitInfraStub({ diff: 'diff content' })
        }
      })

      await expect(inspectCommand('main', 'HEAD', {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('message containing Resets appears when RateLimitError has resetInfo', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: makeThrowingStub(new RateLimitError('2026-12-31')),
          gitInfra: buildGitInfraStub({ diff: 'diff content' })
        }
      })

      await expect(inspectCommand('main', 'HEAD', {})).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Claude usage limit reached. Resets: 2026-12-31 Please wait and try again.'
      )
    })

    it('process.exit is called with 1 when RateLimitError has no resetInfo', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: makeThrowingStub(new RateLimitError()),
          gitInfra: buildGitInfraStub({ diff: 'diff content' })
        }
      })

      await expect(inspectCommand('main', 'HEAD', {})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('message without Resets appears when RateLimitError has no resetInfo', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: makeThrowingStub(new RateLimitError()),
          gitInfra: buildGitInfraStub({ diff: 'diff content' })
        }
      })

      await expect(inspectCommand('main', 'HEAD', {})).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        'Claude usage limit reached. Please wait and try again.'
      )
    })
  })
})
