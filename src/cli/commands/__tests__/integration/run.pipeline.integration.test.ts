import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { runCommand } from '../../run'
import { setupContainer } from '@src/core/di/setup'
import {
  makeResultLines,
  buildClaudeCodeStub,
  buildGitInfraStub,
  buildFileMoveInfraStub,
  buildShellInfraStub,
  buildFsInfraWithCwd,
  writePipelineFixture,
  makeTmpDir,
  buildTestConfig
} from './helpers'
import { stdout } from '@src/utils/output'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')

describe('runCommand pipeline scenarios (integration)', () => {
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

  describe('script rejection flow', () => {
    it('script fails + when rejected.to agent retries then exits with PipelineMaxRetriesError (exit 1)', async () => {
      const rejectionPipeline = {
        tasks: [
          { type: 'agent', name: 'fixer', task: 'fix it' },
          { type: 'script', command: 'test', rejected: { to: 'fixer', max_retries: 1 } }
        ]
      }
      const path = writePipelineFixture(dir, rejectionPipeline)
      const claudeStub = buildClaudeCodeStub(makeResultLines('done'))

      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: claudeStub,
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub(),
          shellInfra: buildShellInfraStub({ exitCode: 1, stdout: 'test failed', stderr: '' })
        }
      })

      try {
        await runCommand(path, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(process.exit).toHaveBeenCalledWith(1)
      expect(claudeStub.runClaude).toHaveBeenCalledTimes(2)
    })
  })

  describe('agent limit exceeded', () => {
    it('pipeline completes normally when max_messages exceeded', async () => {
      const limitPipeline = {
        tasks: [{ type: 'agent', task: 'do something', max_messages: 1 }]
      }
      const path = writePipelineFixture(dir, limitPipeline)

      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: buildClaudeCodeStub(makeResultLines('done')),
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      await runCommand(path, { batch: true })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(
        expect.stringContaining('Pipeline complete.')
      )
    })

    it('pipeline completes normally when max_context_tokens exceeded', async () => {
      const limitPipeline = {
        tasks: [{ type: 'agent', task: 'do something', max_context_tokens: 5 }]
      }
      const path = writePipelineFixture(dir, limitPipeline)

      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: buildClaudeCodeStub(makeResultLines('done')),
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      await runCommand(path, { batch: true })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(
        expect.stringContaining('Pipeline complete.')
      )
    })
  })

  describe('agent rejection via feedback file', () => {
    const feedbackDir = join(process.cwd(), '.claude', 'tmp')

    afterEach(() => {
      rmSync(feedbackDir, { recursive: true, force: true })
    })

    it('when agent is rejected + feedback file exists pipeline completes after retry', async () => {
      mkdirSync(feedbackDir, { recursive: true })
      writeFileSync(join(feedbackDir, 'coder'), 'assertion error in test.ts')

      const rejectionPipeline = {
        tasks: [
          {
            type: 'agent',
            name: 'coder',
            task: 'write code',
            rejected: { to: 'coder', max_retries: 1 }
          }
        ]
      }
      const path = writePipelineFixture(dir, rejectionPipeline)
      const claudeStub = buildClaudeCodeStub(makeResultLines('done'))

      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: claudeStub,
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      await runCommand(path, { batch: true })

      expect(claudeStub.runClaude).toHaveBeenCalledTimes(2)
      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(
        expect.stringContaining('Pipeline complete.')
      )
    })
  })

  describe('nested pipeline (type: pipeline)', () => {
    it('inline nested pipeline tasks execute and pipeline completes', async () => {
      const nestedPipeline = {
        tasks: [
          {
            type: 'pipeline',
            name: 'sub',
            tasks: [{ type: 'agent', task: 'do work' }]
          }
        ]
      }
      const path = writePipelineFixture(dir, nestedPipeline)
      const claudeStub = buildClaudeCodeStub(makeResultLines('done'))

      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: claudeStub,
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      await runCommand(path, { batch: true })

      expect(claudeStub.runClaude).toHaveBeenCalledTimes(1)
      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(
        expect.stringContaining('Pipeline complete.')
      )
    })
  })

  describe('script rejection with intermediate task skip', () => {
    it('during retry with 3 tasks intermediate task skipped while remaining done', async () => {
      const pipeline = {
        tasks: [
          { type: 'agent', name: 'coder', task: 'write code' },
          { type: 'agent', name: 'reviewer', task: 'review code' },
          { type: 'script', command: 'test', rejected: { to: 'coder', max_retries: 1 } }
        ]
      }
      const path = writePipelineFixture(dir, pipeline)
      const claudeStub = buildClaudeCodeStub(makeResultLines('done'))

      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: claudeStub,
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub(),
          shellInfra: buildShellInfraStub({ exitCode: 1, stdout: 'test failed', stderr: '' })
        }
      })

      try {
        await runCommand(path, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(process.exit).toHaveBeenCalledWith(1)
      expect(claudeStub.runClaude).toHaveBeenCalledTimes(3)
    })
  })

  describe('outerRejection propagation to nested pipeline', () => {
    it('script rejection propagates to nested pipeline but is not re-executed (done-flag bug)', async () => {
      const pipeline = {
        tasks: [
          {
            type: 'pipeline',
            name: 'coder',
            tasks: [{ type: 'agent', task: 'write code' }]
          },
          { type: 'script', command: 'test', rejected: { to: 'coder', max_retries: 1 } }
        ]
      }
      const path = writePipelineFixture(dir, pipeline)
      const claudeStub = buildClaudeCodeStub(makeResultLines('done'))

      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: claudeStub,
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub(),
          shellInfra: buildShellInfraStub({ exitCode: 1, stdout: 'test failed', stderr: '' })
        }
      })

      try {
        await runCommand(path, { batch: true })
      } catch {
        /* expected exit */
      }

      expect(process.exit).toHaveBeenCalledWith(1)
      expect(claudeStub.runClaude).toHaveBeenCalledTimes(1)
    })
  })

  describe('procedure loading', () => {
    it('when procedure is specified on task local procedure is loaded', async () => {
      mkdirSync(join(dir, 'procedures'), { recursive: true })
      writeFileSync(join(dir, 'procedures', 'test-proc.md'), '# Test procedure')

      const procPipeline = {
        tasks: [{ type: 'agent', task: 'do something', procedure: 'test-proc' }]
      }
      const path = writePipelineFixture(dir, procPipeline)

      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: buildClaudeCodeStub(makeResultLines('done')),
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub(),
          fsInfra: buildFsInfraWithCwd(dir)
        }
      })

      await runCommand(path, { batch: true })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(
        expect.stringContaining('Pipeline complete.')
      )
    })
  })
})
