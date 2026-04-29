import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync } from 'fs'
import { join } from 'path'
import { runCommand } from '../../run'
import { setupContainer } from '@src/core/di/setup'
import {
  makeTmpDir,
  buildTestConfig,
  buildGitInfraStub,
  buildFileMoveInfraStub,
  buildClaudeCodeStub,
  makeResultLines,
  writePipelineFixture,
  writeYamlFixture
} from './helpers'
import { stdout } from '@src/utils/output'

vi.mock('@src/utils/output')
vi.mock('@src/cli/view/display')
vi.mock('@src/cli/prompt')

const MINIMAL_PIPELINE_RAW = {
  tasks: [{ type: 'agent', task: 'do something' }]
}

const CHILD_PIPELINE_RAW = {
  tasks: [{ type: 'agent', task: 'child task' }]
}

describe('runCommand post-pipeline behavior (integration)', () => {
  let dir: string
  let cleanup: () => void
  let pipelinePath: string

  beforeEach(() => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())
    pipelinePath = writePipelineFixture(dir, MINIMAL_PIPELINE_RAW)
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit')
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('git diff summary', () => {
    it('When headBefore and headAfter differ, "Changes committed during pipeline" is printed to stdout', async () => {
      const gitInfra = buildGitInfraStub({
        head: ['abc1234567', 'def4567890'],
        diffSummary: '1 file changed'
      })
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: buildClaudeCodeStub(makeResultLines('done')),
          gitInfra,
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      await runCommand(pipelinePath, { batch: true })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(
        expect.stringContaining('Changes committed during pipeline')
      )
    })

    it('When headBefore and headAfter are the same, diff summary is not printed', async () => {
      const gitInfra = buildGitInfraStub({
        head: ['abc1234567', 'abc1234567'],
        diffSummary: '1 file changed'
      })
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: buildClaudeCodeStub(makeResultLines('done')),
          gitInfra,
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      await runCommand(pipelinePath, { batch: true })

      expect(vi.mocked(stdout).print).not.toHaveBeenCalledWith(
        expect.stringContaining('Changes committed during pipeline')
      )
    })

    it('When headBefore is null, diff summary is not printed', async () => {
      const gitInfra = buildGitInfraStub({
        head: [null, 'def4567890'],
        diffSummary: '1 file changed'
      })
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: buildClaudeCodeStub(makeResultLines('done')),
          gitInfra,
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      await runCommand(pipelinePath, { batch: true })

      expect(vi.mocked(stdout).print).not.toHaveBeenCalledWith(
        expect.stringContaining('Changes committed during pipeline')
      )
    })
  })

  describe('moveToDone (main pipeline)', () => {
    it('When moveToDone returns a path, "Moved to:" is printed to stdout', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: buildClaudeCodeStub(makeResultLines('done')),
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      await runCommand(pipelinePath, { batch: true })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(expect.stringContaining('Moved to:'))
    })

    it('When moveToDone returns a path, commitMove is called (git commit is executed)', async () => {
      const gitInfra = buildGitInfraStub()
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: buildClaudeCodeStub(makeResultLines('done')),
          gitInfra,
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      await runCommand(pipelinePath, { batch: true })

      expect(gitInfra.execGitSync).toHaveBeenCalledWith(expect.stringContaining('commit'))
    })

    it('When moveToDone returns null, "Moved to:" is not printed to stdout', async () => {
      // When pipeline is placed in a directory containing done/ in the path, moveToDone returns null
      mkdirSync(join(dir, 'done'), { recursive: true })
      const donePath = writePipelineFixture(join(dir, 'done'), MINIMAL_PIPELINE_RAW)
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: buildClaudeCodeStub(makeResultLines('done')),
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      await runCommand(donePath, { batch: true })

      expect(vi.mocked(stdout).print).not.toHaveBeenCalledWith(expect.stringContaining('Moved to:'))
    })
  })

  describe('cleanTmpDir', () => {
    it('After pipeline completes, cleanTmpDir is called successfully (no exceptions)', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: buildClaudeCodeStub(makeResultLines('done')),
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      // cleanTmpDir does not throw an exception even if .claude/tmp/ does not exist
      await expect(runCommand(pipelinePath, { batch: true })).resolves.toBeUndefined()
    })
  })

  describe('child pipeline', () => {
    it('When onChildPipelineDone is called, fileMoveInfra.moveFile is called with child path', async () => {
      const mainPipelineRaw = { tasks: [{ type: 'child', path: 'child.yaml' }] }
      const childPipelinePath = writePipelineFixture(dir, mainPipelineRaw)
      writeYamlFixture(join(dir, 'child.yaml'), CHILD_PIPELINE_RAW)

      const fileMoveInfra = buildFileMoveInfraStub()
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: buildClaudeCodeStub(makeResultLines('child done')),
          gitInfra: buildGitInfraStub(),
          fileMoveInfra
        }
      })

      await runCommand(childPipelinePath, { batch: true })

      expect(fileMoveInfra.moveFile).toHaveBeenCalledWith(
        join(dir, 'child.yaml'),
        expect.stringContaining('done/child.yaml')
      )
    })

    it('When child\'s moveToDone returns a path, "Moved to:" is printed to stdout', async () => {
      const mainPipelineRaw = { tasks: [{ type: 'child', path: 'child.yaml' }] }
      const childPipelinePath = writePipelineFixture(dir, mainPipelineRaw)
      writeYamlFixture(join(dir, 'child.yaml'), CHILD_PIPELINE_RAW)

      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: buildClaudeCodeStub(makeResultLines('child done')),
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      await runCommand(childPipelinePath, { batch: true })

      expect(vi.mocked(stdout).print).toHaveBeenCalledWith(expect.stringContaining('Moved to:'))
    })
  })
})
