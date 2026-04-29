import type { PipelineTaskResult } from '@src/services/pipelineService'
import type { RunPipelineInput } from '@src/validators/cli/runPipeline'
import type { Config } from '@src/types/config'
import type { PipelineFileService } from '@src/services/pipelineFileService'
import { stdout } from '@src/utils/output'
import { printResponse } from '@src/cli/view/display'

function taskLabel(taskPath: number[], taskIndex: number): string {
  const prefix = taskPath.length > 0 ? taskPath.map((p) => p + 1).join('.') + '.' : ''
  return `${prefix}${taskIndex + 1}`
}

export function printTaskResult(
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

export function printGitDiffSummary(
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
