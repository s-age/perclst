import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readdirSync } from 'fs'
import { listCommand } from '@src/cli/commands/list'
import { startCommand } from '@src/cli/commands/start'
import { tagCommand } from '@src/cli/commands/tag'
import { setupContainer } from '@src/core/di/setup'
import { makeResultLines, buildClaudeCodeStub, makeTmpDir, buildTestConfig } from './helpers'
import { stdout } from '@src/utils/output'
import { printSessionsTable } from '@src/cli/view/listDisplay'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')
vi.mock('@src/cli/view/listDisplay')

describe('listCommand (integration)', () => {
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
    it('when there are no sessions, stdout outputs "No sessions found"', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await listCommand({})

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith('No sessions found')
    })

    it('when there are sessions, printSessionsTable is called', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('started'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })
      await startCommand('initial task', { outputOnly: true })

      setupContainer({ config: buildTestConfig(dir) })
      await listCommand({})

      expect(vi.mocked(printSessionsTable)).toHaveBeenCalled()
    })

    it('when --label filter is specified, only sessions matching the label are passed to printSessionsTable', async () => {
      // Create session 1 and tag it with 'alpha'
      const stub1 = buildClaudeCodeStub(makeResultLines('started'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub1 } })
      await startCommand('task one', { outputOnly: true })
      const [file1] = readdirSync(dir).filter((f) => f.endsWith('.json'))
      const sessionId1 = file1.replace('.json', '')

      setupContainer({ config: buildTestConfig(dir) })
      await tagCommand(sessionId1, ['alpha'])

      // Create session 2 without a label
      const stub2 = buildClaudeCodeStub(makeResultLines('started2'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub2 } })
      await startCommand('task two', { outputOnly: true })

      // List filtered by label 'alpha'
      setupContainer({ config: buildTestConfig(dir) })
      await listCommand({ label: 'alpha' })

      const [sessions] = vi.mocked(printSessionsTable).mock.calls[0]
      expect(sessions).toHaveLength(1)
    })

    it('when --like filter is specified, only sessions with names matching partially are passed to printSessionsTable', async () => {
      // Create session 1 with a recognisable name
      const stub1 = buildClaudeCodeStub(makeResultLines('started'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub1 } })
      await startCommand('task', { outputOnly: true, name: 'unique-keyword-session' })

      // Create session 2 with a different name
      const stub2 = buildClaudeCodeStub(makeResultLines('other'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub2 } })
      await startCommand('other task', { outputOnly: true, name: 'other-session' })

      // List filtered by partial name match
      setupContainer({ config: buildTestConfig(dir) })
      await listCommand({ like: 'unique-keyword' })

      const [sessions] = vi.mocked(printSessionsTable).mock.calls[0]
      expect(sessions).toHaveLength(1)
    })
  })

  describe('error path', () => {
    it('when ValidationError occurs, process.exit(1) is called', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await expect(listCommand({ label: 123 as unknown as string })).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })
  })
})
