import { tmpdir } from 'os'
import { resolve, join, dirname } from 'path'
import * as readline from 'readline'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { PipelineService } from '@src/services/pipelineService'
import type { PipelineTaskResult } from '@src/services/pipelineService'
import type { PermissionPipeService } from '@src/services/permissionPipeService'
import { ValidationError } from '@src/errors/validationError'
import { RateLimitError } from '@src/errors/rateLimitError'
import { APIError } from '@src/errors/apiError'
import { PipelineMaxRetriesError } from '@src/errors/pipelineMaxRetriesError'
import { stdout, stderr } from '@src/utils/output'
import { printResponse, printStreamEvent } from '@src/cli/display'
import { parseRunOptions, parsePipeline } from '@src/validators/cli/runPipeline'
import type { RunPipelineInput } from '@src/validators/cli/runPipeline'
import type { Config } from '@src/types/config'
import type { AgentStreamEvent } from '@src/types/agent'
import type { Pipeline } from '@src/types/pipeline'
import type { PipelineFileService } from '@src/services/pipelineFileService'

type RawRunOptions = {
  model?: string
  outputOnly?: boolean
  batch?: boolean
  yes?: boolean
  format?: string
}

function taskLabel(taskPath: number[], taskIndex: number): string {
  const prefix = taskPath.length > 0 ? taskPath.map((p) => p + 1).join('.') + '.' : ''
  return `${prefix}${taskIndex + 1}`
}

function printTaskResult(
  result: PipelineTaskResult,
  input: RunPipelineInput,
  config: Config,
  streaming: boolean
): void {
  if (result.kind === 'retry' || result.kind === 'pipeline_end') {
    return
  }
  if (result.kind === 'task_start') {
    if (result.taskType === 'child') {
      const num = taskLabel(result.taskPath, result.taskIndex)
      const label = result.name
        ? `${result.name} (${result.childPath ?? ''})`
        : (result.childPath ?? '[child]')
      stdout.print(`\nTask ${num} [child]: ${label}`)
    }
    return
  }
  if (result.kind === 'script') {
    const status = result.result.exitCode === 0 ? 'ok' : `exit ${result.result.exitCode}`
    stdout.print(
      `\nTask ${taskLabel(result.taskPath, result.taskIndex)} [script] ${status}: ${result.command}`
    )
    if (result.result.stdout) stdout.print(result.result.stdout.trimEnd())
    if (result.result.stderr) stdout.print(result.result.stderr.trimEnd())
  } else {
    const num = taskLabel(result.taskPath, result.taskIndex)
    const label = result.name
      ? `Task ${num}: ${result.name} [${result.action}]`
      : `Task ${num} [${result.action}]`
    stdout.print(`\n${label} — session: ${result.sessionId}`)
    printResponse(
      result.response,
      {
        outputOnly: input.outputOnly,
        format: input.format,
        silentThoughts: streaming,
        silentToolResponse: streaming
      },
      config.display,
      { sessionId: result.sessionId }
    )
  }
}

function markTaskDone(pipeline: Pipeline, taskPath: number[], taskIndex: number): void {
  let tasks = pipeline.tasks
  for (const step of taskPath) {
    const parent = tasks[step]
    if (parent.type !== 'pipeline') return
    tasks = parent.tasks
  }
  if (tasks[taskIndex]) tasks[taskIndex].done = true
}

function makeChildLoader(
  pipelineFileService: PipelineFileService
): (absolutePath: string) => Pipeline {
  return (absolutePath: string): Pipeline => {
    const raw = pipelineFileService.loadRawPipeline(absolutePath)
    return parsePipeline(raw)
  }
}

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

async function checkUncommittedChanges(pipelineFileService: PipelineFileService): Promise<void> {
  const diffStat = pipelineFileService.getDiffStat()
  if (!diffStat) return
  stderr.print(`\nUncommitted changes detected:\n${diffStat}\n`)
  const ok = await confirm('Run pipeline with uncommitted changes? [y/N] ')
  if (!ok) {
    stdout.print('Aborted.')
    process.exit(0)
  }
}

function printGitDiffSummary(
  pipelineFileService: PipelineFileService,
  fromHash: string,
  toHash: string
): void {
  const stat = pipelineFileService.getDiffSummary(fromHash, toHash)
  if (!stat) return
  stdout.print(
    `\nChanges committed during pipeline (${fromHash.slice(0, 7)}...${toHash.slice(0, 7)}):`
  )
  stdout.print(stat)
  stdout.print(`\nTo inspect: git diff ${fromHash}...${toHash}`)
}

async function executeTUIPipeline(
  input: RunPipelineInput,
  pipelineFileService: PipelineFileService,
  onChildPipelineDone: (absolutePath: string) => void
): Promise<void> {
  process.env.PERCLST_PERMISSION_PIPE = join(tmpdir(), `perclst-perm-${process.pid}`)
  if (input.yes) process.env.PERCLST_PERMISSION_AUTO_YES = '1'
  const absolutePath = resolve(input.pipelinePath)
  let raw: unknown
  try {
    raw = pipelineFileService.loadRawPipeline(absolutePath)
  } catch {
    stderr.print(`Failed to read pipeline file: ${absolutePath}`)
    process.exit(1)
  }
  const pipeline = parsePipeline(raw)
  const { render } = await import('ink')
  const React = (await import('react')).default
  const { PipelineRunner } = await import('@src/cli/components/PipelineRunner.js')
  const pipelineService = container.resolve<PipelineService>(TOKENS.PipelineService)
  const permissionPipeService = container.resolve<PermissionPipeService>(
    TOKENS.PermissionPipeService
  )
  const config = container.resolve<Config>(TOKENS.Config)
  const onTaskDone = (taskPath: number[], taskIndex: number): void => {
    markTaskDone(pipeline, taskPath, taskIndex)
    pipelineFileService.savePipeline(absolutePath, pipeline)
  }
  const loadChildPipeline = makeChildLoader(pipelineFileService)
  const pipelineDir = dirname(absolutePath)
  await new Promise<void>((resolve, reject) => {
    const app = render(
      React.createElement(PipelineRunner, {
        pipeline,
        options: {
          model: input.model,
          onTaskDone,
          loadChildPipeline,
          pipelineDir,
          onChildPipelineDone
        },
        pipelineService,
        permissionPipeService,
        config,
        onDone: () => {
          app.unmount()
          resolve()
        },
        onError: (err) => {
          app.unmount()
          reject(err)
        }
      })
    )
  })
}

async function executePipeline(
  input: RunPipelineInput,
  pipelineFileService: PipelineFileService,
  onChildPipelineDone: (absolutePath: string) => void
): Promise<void> {
  if (input.yes) process.env.PERCLST_PERMISSION_AUTO_YES = '1'
  const absolutePath = resolve(input.pipelinePath)
  let raw: unknown
  try {
    raw = pipelineFileService.loadRawPipeline(absolutePath)
  } catch {
    stderr.print(`Failed to read pipeline file: ${absolutePath}`)
    process.exit(1)
  }

  const pipeline = parsePipeline(raw)
  const pipelineService = container.resolve<PipelineService>(TOKENS.PipelineService)
  const config = container.resolve<Config>(TOKENS.Config)

  const streaming = !input.outputOnly && input.format !== 'json'
  const onStreamEvent = streaming
    ? (event: AgentStreamEvent): void => printStreamEvent(event, config.display)
    : undefined
  const onTaskDone = (taskPath: number[], taskIndex: number): void => {
    markTaskDone(pipeline, taskPath, taskIndex)
    pipelineFileService.savePipeline(absolutePath, pipeline)
  }
  const loadChildPipeline = makeChildLoader(pipelineFileService)
  const pipelineDir = dirname(absolutePath)

  stdout.print(`Running pipeline: ${pipeline.tasks.length} task(s)`)

  let count = 0
  for await (const result of pipelineService.run(pipeline, {
    model: input.model,
    onStreamEvent,
    onTaskDone,
    loadChildPipeline,
    pipelineDir,
    onChildPipelineDone
  })) {
    count++
    printTaskResult(result, input, config, streaming)
  }

  stdout.print(`\nPipeline complete. ${count} task(s) finished.`)
}

export async function runCommand(pipelinePath: string, options: RawRunOptions): Promise<void> {
  try {
    const pipelineFileService = container.resolve<PipelineFileService>(TOKENS.PipelineFileService)

    await checkUncommittedChanges(pipelineFileService)

    const input = parseRunOptions({ pipelinePath, ...options })
    const headBefore = pipelineFileService.getHead()

    const completedChildPaths: string[] = []
    const onChildPipelineDone = (absolutePath: string): void => {
      completedChildPaths.push(absolutePath)
    }

    if (process.stdout.isTTY && !input.batch) {
      await executeTUIPipeline(input, pipelineFileService, onChildPipelineDone)
    } else {
      await executePipeline(input, pipelineFileService, onChildPipelineDone)
    }

    const headAfter = pipelineFileService.getHead()
    if (headBefore && headAfter && headBefore !== headAfter) {
      printGitDiffSummary(pipelineFileService, headBefore, headAfter)
    }

    for (const childPath of completedChildPaths) {
      const childDonePath = pipelineFileService.moveToDone(childPath)
      if (childDonePath) {
        stdout.print(`\nMoved to: ${childDonePath}`)
        pipelineFileService.commitMove(childPath, childDonePath)
      }
    }

    const donePath = pipelineFileService.moveToDone(input.pipelinePath)
    if (donePath) {
      stdout.print(`\nMoved to: ${donePath}`)
      pipelineFileService.commitMove(input.pipelinePath, donePath)
    }
    pipelineFileService.cleanTmpDir()
  } catch (error) {
    if (error instanceof ValidationError) {
      stderr.print(`Invalid arguments: ${error.message}`)
    } else if (error instanceof PipelineMaxRetriesError) {
      stderr.print(error.message)
    } else if (error instanceof RateLimitError) {
      const resetMsg = error.resetInfo ? ` Resets: ${error.resetInfo}` : ''
      stderr.print(`Claude usage limit reached.${resetMsg} Please wait and try again.`)
    } else if (error instanceof APIError) {
      stderr.print(`Pipeline failed: ${error.message}`)
    } else {
      stderr.print('Pipeline failed', error as Error)
    }
    process.exit(1)
  }
}
