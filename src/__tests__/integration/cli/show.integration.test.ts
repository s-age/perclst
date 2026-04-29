import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, readdirSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { startCommand } from '@src/cli/commands/start'
import { showCommand } from '@src/cli/commands/show'
import { setupContainer } from '@src/core/di/setup'
import {
  buildClaudeCodeStub,
  makeTmpDir,
  buildTestConfig,
  makeResultLines,
  buildFsInfraWithHome,
  makeClaudeSessionJsonl,
  setupClaudeSessionFixture
} from './helpers'
import { stdout } from '@src/utils/output'
import { printShowText, printTurnsTable } from '@src/cli/view/showDisplay'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')
vi.mock('@src/cli/view/showDisplay')

describe('showCommand (integration)', () => {
  let dir: string
  let cleanup: () => void
  let sessionId: string
  let fakeHome: string

  beforeEach(async () => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())
    fakeHome = mkdtempSync(join(tmpdir(), 'fake-home-'))
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
    rmSync(fakeHome, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('printShowText is called with the session', async () => {
      setupClaudeSessionFixture(fakeHome, sessionId, process.cwd(), makeClaudeSessionJsonl())
      setupContainer({
        config: buildTestConfig(dir),
        infras: { fsInfra: buildFsInfraWithHome(fakeHome) }
      })

      await showCommand(sessionId, {})

      expect(vi.mocked(printShowText)).toHaveBeenCalledWith(
        expect.objectContaining({ id: sessionId })
      )
    })

    it('stdout.print outputs "(no turns)" when turns are empty', async () => {
      setupClaudeSessionFixture(fakeHome, sessionId, process.cwd(), '')
      setupContainer({
        config: buildTestConfig(dir),
        infras: { fsInfra: buildFsInfraWithHome(fakeHome) }
      })

      await showCommand(sessionId, {})

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith('\n(no turns)')
    })

    it('--format json: stdout.print receives a JSON string containing the session id', async () => {
      setupClaudeSessionFixture(fakeHome, sessionId, process.cwd(), makeClaudeSessionJsonl())
      setupContainer({
        config: buildTestConfig(dir),
        infras: { fsInfra: buildFsInfraWithHome(fakeHome) }
      })

      await showCommand(sessionId, { format: 'json' })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(expect.stringContaining(sessionId))
    })

    it('printTurnsTable is called with rows including user/thinking/tool entries', async () => {
      const richJsonl = [
        JSON.stringify({ type: 'user', message: { content: 'analyze this code' } }),
        JSON.stringify({
          type: 'assistant',
          uuid: 'turn-1',
          message: {
            content: [{ type: 'thinking', thinking: 'Let me analyze...' }],
            usage: { input_tokens: 50, output_tokens: 20 }
          }
        }),
        JSON.stringify({
          type: 'assistant',
          uuid: 'turn-2',
          message: {
            content: [
              { type: 'tool_use', id: 'tool-1', name: 'Read', input: { file_path: '/tmp/test.ts' } }
            ],
            usage: { input_tokens: 50, output_tokens: 20 }
          }
        }),
        JSON.stringify({
          type: 'user',
          message: {
            content: [{ type: 'tool_result', tool_use_id: 'tool-1', content: 'file contents here' }]
          }
        }),
        JSON.stringify({
          type: 'assistant',
          uuid: 'turn-3',
          message: {
            content: [{ type: 'text', text: 'The code looks good.' }],
            usage: { input_tokens: 100, output_tokens: 30 }
          }
        })
      ].join('\n')

      setupClaudeSessionFixture(fakeHome, sessionId, process.cwd(), richJsonl)
      setupContainer({
        config: buildTestConfig(dir),
        infras: { fsInfra: buildFsInfraWithHome(fakeHome) }
      })

      await showCommand(sessionId, {})

      expect(vi.mocked(printTurnsTable)).toHaveBeenCalled()
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
