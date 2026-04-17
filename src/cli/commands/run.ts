import { readFileSync } from 'fs'
import { resolve } from 'path'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { PipelineService } from '@src/services/pipelineService'
import { ValidationError } from '@src/errors/validationError'
import { RateLimitError } from '@src/errors/rateLimitError'
import { PipelineMaxRetriesError } from '@src/errors/pipelineMaxRetriesError'
import { logger } from '@src/utils/logger'
import { printResponse } from '@src/cli/display'
import { parseRunOptions, parsePipeline } from '@src/validators/cli/runPipeline'
import type { Config } from '@src/types/config'

type RawRunOptions = {
  model?: string
  outputOnly?: boolean
  format?: string
}

export async function runCommand(pipelinePath: string, options: RawRunOptions) {
  try {
    const input = parseRunOptions({ pipelinePath, ...options })

    const absolutePath = resolve(input.pipelinePath)
    let raw: unknown
    try {
      raw = JSON.parse(readFileSync(absolutePath, 'utf-8'))
    } catch {
      logger.error(`Failed to read pipeline file: ${absolutePath}`)
      process.exit(1)
    }

    const pipeline = parsePipeline(raw)

    const pipelineService = container.resolve<PipelineService>(TOKENS.PipelineService)
    const config = container.resolve<Config>(TOKENS.Config)

    logger.print(`Running pipeline: ${pipeline.tasks.length} task(s)`)

    const { results } = await pipelineService.run(pipeline, { model: input.model })

    for (const result of results) {
      if (result.kind === 'script') {
        const status = result.result.exitCode === 0 ? 'ok' : `exit ${result.result.exitCode}`
        logger.print(`\nTask ${result.taskIndex + 1} [script] ${status}: ${result.command}`)
        if (result.result.stdout) logger.print(result.result.stdout.trimEnd())
        if (result.result.stderr) logger.print(result.result.stderr.trimEnd())
      } else {
        const label = result.name
          ? `Task ${result.taskIndex + 1}: ${result.name} [${result.action}]`
          : `Task ${result.taskIndex + 1} [${result.action}]`
        logger.print(`\n${label} — session: ${result.sessionId}`)
        printResponse(
          result.response,
          { outputOnly: input.outputOnly, format: input.format },
          config.display,
          { sessionId: result.sessionId }
        )
      }
    }

    logger.print(`\nPipeline complete. ${results.length} task(s) finished.`)
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.error(`Invalid arguments: ${error.message}`)
    } else if (error instanceof PipelineMaxRetriesError) {
      logger.error(error.message)
    } else if (error instanceof RateLimitError) {
      const resetMsg = error.resetInfo ? ` Resets: ${error.resetInfo}` : ''
      logger.error(`Claude usage limit reached.${resetMsg} Please wait and try again.`)
    } else {
      logger.error('Pipeline failed', error as Error)
    }
    process.exit(1)
  }
}
