import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { startCommand } from '@src/cli/commands/start'
import { sweepCommand } from '@src/cli/commands/sweep'
import { setupContainer } from '@src/core/di/setup'
import { makeResultLines, buildClaudeCodeStub, makeTmpDir, buildTestConfig } from './helpers'
import { stdout, stderr } from '@src/utils/output'
import { printSweepResult } from '@src/cli/view/sweepDisplay'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')
vi.mock('@src/cli/view/sweepDisplay')

describe('sweepCommand (integration)', () => {
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
    it('when no match, stdout prints No sessions matched', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await sweepCommand({ status: 'active', force: true })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith('No sessions matched the given filters')
    })

    it('when dryRun: true, files remain', async () => {
      const startStub = buildClaudeCodeStub(makeResultLines('started'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: startStub } })
      await startCommand('initial task', { outputOnly: true })
      const [file] = readdirSync(dir).filter((f) => f.endsWith('.json'))

      setupContainer({ config: buildTestConfig(dir) })
      await sweepCommand({ status: 'completed', dryRun: true })

      expect(existsSync(join(dir, file))).toBe(true)
    })

    it('when dryRun: true, printSweepResult is called with dryRun=true', async () => {
      const startStub = buildClaudeCodeStub(makeResultLines('started'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: startStub } })
      await startCommand('initial task', { outputOnly: true })

      setupContainer({ config: buildTestConfig(dir) })
      await sweepCommand({ status: 'completed', dryRun: true })

      expect(vi.mocked(printSweepResult)).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ metadata: expect.objectContaining({ status: 'completed' }) })
        ]),
        true
      )
    })

    it('when force: true, target session files are deleted', async () => {
      const startStub = buildClaudeCodeStub(makeResultLines('started'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: startStub } })
      await startCommand('initial task', { outputOnly: true })
      const [file] = readdirSync(dir).filter((f) => f.endsWith('.json'))

      setupContainer({ config: buildTestConfig(dir) })
      await sweepCommand({ status: 'completed', force: true })

      expect(existsSync(join(dir, file))).toBe(false)
    })

    it('--status filter deletes only sessions with matching status', async () => {
      // Create two sessions
      const startStub1 = buildClaudeCodeStub(makeResultLines('started'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: startStub1 } })
      await startCommand('task one', { outputOnly: true })

      const startStub2 = buildClaudeCodeStub(makeResultLines('started'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: startStub2 } })
      await startCommand('task two', { outputOnly: true })

      const filesBefore = readdirSync(dir).filter((f) => f.endsWith('.json'))
      expect(filesBefore).toHaveLength(2)

      // Sweep only 'active' — both sessions are 'completed', so none should be deleted
      setupContainer({ config: buildTestConfig(dir) })
      await sweepCommand({ status: 'active', force: true })

      const filesAfter = readdirSync(dir).filter((f) => f.endsWith('.json'))
      expect(filesAfter).toHaveLength(2)
    })
  })

  describe('error path', () => {
    it('when invalid date format, process.exit(1) is called', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await expect(sweepCommand({ from: 'not-a-date', force: true })).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('when invalid date format, stderr prints Invalid arguments', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await expect(sweepCommand({ from: 'not-a-date', force: true })).rejects.toThrow('exit')
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith(
        expect.stringContaining('Invalid arguments:')
      )
    })

    it('when no filter is specified, process.exit(1) is called', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await expect(sweepCommand({})).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('when invalid status value, process.exit(1) is called', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await expect(sweepCommand({ status: 'unknown', force: true })).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('when --to is omitted and neither --force nor --dry-run is provided, process.exit(1) is called', async () => {
      setupContainer({ config: buildTestConfig(dir) })

      await expect(sweepCommand({ status: 'completed' })).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })

    it('when Generic Error occurs, process.exit(1) is called and Failed to sweep sessions is printed', async () => {
      // Force an error by patching the container after setup
      setupContainer({ config: buildTestConfig(dir) })

      const err = new Error('disk failure')
      vi.spyOn((await import('@src/core/di/container')).container, 'resolve').mockImplementation(
        () => {
          throw err
        }
      )

      await expect(sweepCommand({ status: 'completed', force: true })).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
      expect(vi.mocked(stderr).print).toHaveBeenCalledWith('Failed to sweep sessions', err)
    })
  })
})
