import { readFileSync } from 'fs'
import { tmpdir } from 'os'
import { resolve, join } from 'path'
import { execSync } from 'child_process'
import * as readline from 'readline'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { PipelineService } from '@src/services/pipelineService'
import type { PipelineTaskResult } from '@src/services/pipelineService'
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

type RawRunOptions = {
  model?: string
  outputOnly?: boolean
  batch?: boolean
  format?: string
}

function printTaskResult(
  result: PipelineTaskResult,
  input: RunPipelineInput,
  config: Config,
  streaming: boolean
): void {
  if (result.kind === 'script') {
    const status = result.result.exitCode === 0 ? 'ok' : `exit ${result.result.exitCode}`
    stdout.print(`\nTask ${result.taskIndex + 1} [script] ${status}: ${result.command}`)
    if (result.result.stdout) stdout.print(result.result.stdout.trimEnd())
    if (result.result.stderr) stdout.print(result.result.stderr.trimEnd())
  } else {
    const label = result.name
      ? `Task ${result.taskIndex + 1}: ${result.name} [${result.action}]`
      : `Task ${result.taskIndex + 1} [${result.action}]`
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

function getGitDiffStat(): string | null {
  try {
    const staged = execSync('git diff --cached --stat', { encoding: 'utf-8' }).trim()
    const unstaged = execSync('git diff --stat', { encoding: 'utf-8' }).trim()
    const combined = [staged, unstaged].filter(Boolean).join('\n')
    return combined || null
  } catch {
    return null
  }
}

function getGitHead(): string | null {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim()
  } catch {
    return null
  }
}

function printGitDiffSummary(fromHash: string, toHash: string): void {
  try {
    const stat = execSync(`git diff ${fromHash}...${toHash} --stat`, { encoding: 'utf-8' }).trim()
    if (!stat) return
    stdout.print(
      `\nChanges committed during pipeline (${fromHash.slice(0, 7)}...${toHash.slice(0, 7)}):`
    )
    stdout.print(stat)
    stdout.print(`\nTo inspect: git diff ${fromHash}...${toHash}`)
  } catch {
    // not in a git repo or no diff available
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

async function checkUncommittedChanges(): Promise<void> {
  const diffStat = getGitDiffStat()
  if (!diffStat) return
  stderr.print(`\nUncommitted changes detected:\n${diffStat}\n`)
  const ok = await confirm('Run pipeline with uncommitted changes? [y/N] ')
  if (!ok) {
    stdout.print('Aborted.')
    process.exit(0)
  }
}

async function executeTUIPipeline(input: RunPipelineInput): Promise<void> {
  process.env.PERCLST_PERMISSION_PIPE = join(tmpdir(), `perclst-perm-${process.pid}`)
  const absolutePath = resolve(input.pipelinePath)
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(absolutePath, 'utf-8'))
  } catch {
    stderr.print(`Failed to read pipeline file: ${absolutePath}`)
    process.exit(1)
  }
  const pipeline = parsePipeline(raw)
  const { render } = await import('ink')
  const React = (await import('react')).default
  const { PipelineRunner } = await import('@src/cli/components/PipelineRunner.js')
  const pipelineService = container.resolve<PipelineService>(TOKENS.PipelineService)
  const config = container.resolve<Config>(TOKENS.Config)
  await new Promise<void>((resolve, reject) => {
    const app = render(
      React.createElement(PipelineRunner, {
        pipeline,
        options: { model: input.model },
        pipelineService,
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

async function executePipeline(input: RunPipelineInput): Promise<void> {
  const absolutePath = resolve(input.pipelinePath)
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(absolutePath, 'utf-8'))
  } catch {
    stderr.print(`Failed to read pipeline file: ${absolutePath}`)
    process.exit(1)
  }

  const pipeline = parsePipeline(raw)
  const pipelineService = container.resolve<PipelineService>(TOKENS.PipelineService)
  const config = container.resolve<Config>(TOKENS.Config)

  const streaming = !input.outputOnly && input.format !== 'json'
  const onStreamEvent = streaming
    ? (event: AgentStreamEvent) => printStreamEvent(event, config.display)
    : undefined

  stdout.print(`Running pipeline: ${pipeline.tasks.length} task(s)`)

  let count = 0
  for await (const result of pipelineService.run(pipeline, { model: input.model, onStreamEvent })) {
    count++
    printTaskResult(result, input, config, streaming)
  }

  stdout.print(`\nPipeline complete. ${count} task(s) finished.`)
}

export async function runCommand(pipelinePath: string, options: RawRunOptions) {
  try {
    await checkUncommittedChanges()

    const input = parseRunOptions({ pipelinePath, ...options })
    const headBefore = getGitHead()

    if (process.stdout.isTTY && !input.batch) {
      await executeTUIPipeline(input)
    } else {
      await executePipeline(input)
    }

    const headAfter = getGitHead()
    if (headBefore && headAfter && headBefore !== headAfter) {
      printGitDiffSummary(headBefore, headAfter)
    }
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
