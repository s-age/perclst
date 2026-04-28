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
    it('headBefore と headAfter が異なるとき "Changes committed during pipeline" が stdout に出力される', async () => {
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

    it('headBefore と headAfter が同一のとき diff summary が出力されない', async () => {
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

    it('headBefore が null のとき diff summary が出力されない', async () => {
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
    it('moveToDone がパスを返すとき stdout に "Moved to:" が出力される', async () => {
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

    it('moveToDone がパスを返すとき commitMove が呼ばれる (git commit が実行される)', async () => {
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

    it('moveToDone が null を返すとき stdout に "Moved to:" が出力されない', async () => {
      // パスに done/ を含むディレクトリに pipeline を配置すると moveToDone は null を返す
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
    it('パイプライン完了後に cleanTmpDir が正常に呼ばれる (例外なし)', async () => {
      setupContainer({
        config: buildTestConfig(dir),
        infras: {
          claudeCodeInfra: buildClaudeCodeStub(makeResultLines('done')),
          gitInfra: buildGitInfraStub(),
          fileMoveInfra: buildFileMoveInfraStub()
        }
      })

      // cleanTmpDir は .claude/tmp/ が存在しなくても例外を投げない
      await expect(runCommand(pipelinePath, { batch: true })).resolves.toBeUndefined()
    })
  })

  describe('child pipeline', () => {
    it('onChildPipelineDone が呼ばれたとき fileMoveInfra.moveFile が child パスで呼ばれる', async () => {
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

    it('child の moveToDone がパスを返すとき stdout に "Moved to:" が出力される', async () => {
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
