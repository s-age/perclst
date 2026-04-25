import { ClaudeCodeInfra } from '@src/infrastructures/claudeCode'
import {
  createParseState,
  processLine,
  finalizeParseState,
  emitStreamEvents
} from '@src/repositories/parsers/claudeCodeParser'
import type { IClaudeCodeRepository } from '@src/repositories/ports/agent'
import { RawExitError } from '@src/errors/rawExitError'
import { APIError } from '@src/errors/apiError'
import { RateLimitError } from '@src/errors/rateLimitError'
import type { ClaudeAction, RawOutput } from '@src/types/claudeCode'
import type { AgentStreamEvent } from '@src/types/agent'

export class ClaudeCodeRepository implements IClaudeCodeRepository {
  private infra = new ClaudeCodeInfra()

  private classifyExitError(err: RawExitError): never {
    const { code, stderr } = err
    const rateLimitMatch = stderr.match(/resets?\s+([^\n\r]+)/i)
    if (
      stderr.toLowerCase().includes("you've hit your limit") ||
      stderr.toLowerCase().includes('you have hit your limit')
    ) {
      throw new RateLimitError(rateLimitMatch?.[1]?.trim())
    }
    if (stderr) this.infra.writeStderr(stderr)
    throw new APIError(`claude exited with code ${code}`)
  }

  spawnInteractive(args: string[]): void {
    this.infra.spawnInteractive(args)
  }

  async dispatch(
    action: ClaudeAction,
    onStreamEvent?: (event: AgentStreamEvent) => void,
    signal?: AbortSignal
  ): Promise<RawOutput> {
    const args = this.infra.buildArgs(action)

    const baselineSessionId =
      action.type === 'fork' ? action.originalClaudeSessionId : action.sessionId
    const baselineWorkingDir =
      action.type === 'fork' ? action.originalWorkingDir : action.workingDir
    const jsonlBaseline = this.infra.countJsonlLines(
      this.infra.resolveJsonlPath(baselineSessionId, baselineWorkingDir)
    )

    const state = createParseState()
    const toolNameMap = new Map<string, string>()

    try {
      for await (const line of this.infra.runClaude(
        args,
        action.prompt,
        action.workingDir,
        action.sessionFilePath,
        signal
      )) {
        processLine(state, line)
        if (onStreamEvent) emitStreamEvents(line, toolNameMap, onStreamEvent)
      }
    } catch (err) {
      if (err instanceof RawExitError) this.classifyExitError(err)
      throw err
    }

    return finalizeParseState(state, jsonlBaseline)
  }
}
