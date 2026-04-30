import { resolve, dirname } from '@src/utils/path'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { PipelineService } from '@src/services/pipelineService'
import type { PermissionPipeService } from '@src/services/permissionPipeService'
import type { QuestionPipeService } from '@src/services/questionPipeService'
import type { AbortService } from '@src/services/abortService'
import { ValidationError } from '@src/errors/validationError'
import { RateLimitError } from '@src/errors/rateLimitError'
import { APIError } from '@src/errors/apiError'
import { PipelineMaxRetriesError } from '@src/errors/pipelineMaxRetriesError'
import { stdout, stderr } from '@src/utils/output'
import { confirm } from '@src/cli/prompt'
import { printStreamEvent } from '@src/cli/view/display'
import { printTaskResult, printGitDiffSummary } from '@src/cli/view/runDisplay'
import { parseRunOptions, parsePipeline } from '@src/validators/cli/runPipeline'
import type { RunPipelineInput } from '@src/validators/cli/runPipeline'
import type { Config } from '@src/types/config'
import type { AgentStreamEvent } from '@src/types/agent'
import type { Pipeline } from '@src/types/pipeline'
import type { PipelineFileService } from '@src/services/pipelineFileService'

type RawRunOptions = {
  model?: string
  effort?: string
  outputOnly?: boolean
  batch?: boolean
  yes?: boolean
  format?: string
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

function loadPipelineOrExit(
  pipelineFileService: PipelineFileService,
  absolutePath: string
): Pipeline {
  let raw: unknown
  try {
    raw = pipelineFileService.loadRawPipeline(absolutePath)
  } catch {
    stderr.print(`Failed to read pipeline file: ${absolutePath}`)
    process.exit(1)
  }
  return parsePipeline(raw)
}

function handleRunCommandError(error: unknown, abortService: AbortService): never {
  if (abortService.signal.aborted) {
    stdout.print('Aborted.')
    process.exit(130)
  }
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

function resolvePipeServices(): {
  permissionPipeService: PermissionPipeService
  questionPipeService: QuestionPipeService
} {
  const permissionPipeService = container.resolve<PermissionPipeService>(
    TOKENS.PermissionPipeService
  )
  permissionPipeService.initPipePath()
  return {
    permissionPipeService,
    questionPipeService: container.resolve<QuestionPipeService>(TOKENS.QuestionPipeService)
  }
}

async function executeTUIPipeline(
  input: RunPipelineInput,
  pipelineFileService: PipelineFileService,
  onChildPipelineDone: (absolutePath: string) => void,
  abortService: AbortService
): Promise<void> {
  const { permissionPipeService, questionPipeService } = resolvePipeServices()
  if (input.yes) process.env.PERCLST_PERMISSION_AUTO_YES = '1'
  const absolutePath = resolve(input.pipelinePath)
  const pipeline = loadPipelineOrExit(pipelineFileService, absolutePath)
  const [{ render }, { default: React }, { PipelineRunner }] = await Promise.all([
    import('ink'),
    import('react'),
    import('@src/cli/components/PipelineRunner.js')
  ])
  const pipelineService = container.resolve<PipelineService>(TOKENS.PipelineService)
  const config = container.resolve<Config>(TOKENS.Config)
  const onTaskDone = (): void => pipelineFileService.savePipeline(absolutePath, pipeline)
  const pipelineDir = dirname(absolutePath)
  await new Promise<void>((resolve, reject) => {
    const app = render(
      React.createElement(PipelineRunner, {
        pipeline,
        options: {
          model: input.model,
          effort: input.effort,
          onTaskDone,
          pipelineDir,
          onChildPipelineDone
        },
        pipelineService,
        permissionPipeService,
        questionPipeService,
        config,
        signal: abortService.signal,
        onAbort: () => abortService.abort(),
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
  onChildPipelineDone: (absolutePath: string) => void,
  signal?: AbortSignal
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
  const onTaskDone = (): void => pipelineFileService.savePipeline(absolutePath, pipeline)
  const pipelineDir = dirname(absolutePath)

  stdout.print(`Running pipeline: ${pipeline.tasks.length} task(s)`)

  let count = 0
  for await (const result of pipelineService.run(pipeline, {
    model: input.model,
    effort: input.effort,
    onStreamEvent,
    onTaskDone,
    pipelineDir,
    onChildPipelineDone,
    signal
  })) {
    count++
    printTaskResult(result, input, config, streaming)
  }

  stdout.print(`\nPipeline complete. ${count} task(s) finished.`)
}

export async function runCommand(pipelinePath: string, options: RawRunOptions): Promise<void> {
  const abortService = container.resolve<AbortService>(TOKENS.AbortService)

  try {
    const pipelineFileService = container.resolve<PipelineFileService>(TOKENS.PipelineFileService)

    await checkUncommittedChanges(pipelineFileService)

    const onSigint = (): void => abortService.abort()
    process.once('SIGINT', onSigint)

    try {
      const input = parseRunOptions({ pipelinePath, ...options })
      const headBefore = pipelineFileService.getHead()

      const completedChildPaths: string[] = []
      const onChildPipelineDone = (absolutePath: string): void => {
        completedChildPaths.push(absolutePath)
      }

      if (process.stdout.isTTY && !input.batch) {
        await executeTUIPipeline(input, pipelineFileService, onChildPipelineDone, abortService)
      } else {
        await executePipeline(input, pipelineFileService, onChildPipelineDone, abortService.signal)
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
    } finally {
      process.removeListener('SIGINT', onSigint)
    }
  } catch (error) {
    handleRunCommandError(error, abortService)
  }
}
