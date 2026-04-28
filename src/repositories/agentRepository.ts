import type { ClaudeCodeInfra } from '@src/infrastructures/claudeCode'
import {
  createParseState,
  processLine,
  finalizeParseState,
  emitStreamEvents
} from '@src/repositories/parsers/claudeCodeParser'
import { computeMessagesTotalFromContent } from '@src/repositories/parsers/claudeSessionParser'
import type { IClaudeCodeRepository } from '@src/repositories/ports/agent'
import { RawExitError } from '@src/errors/rawExitError'
import { APIError } from '@src/errors/apiError'
import { RateLimitError } from '@src/errors/rateLimitError'
import type { ClaudeAction, RawOutput } from '@src/types/claudeCode'
import type { AgentStreamEvent } from '@src/types/agent'

export class ClaudeCodeRepository implements IClaudeCodeRepository {
  constructor(private infra: ClaudeCodeInfra) {}

  private readBaselines(jsonlPath: string): {
    jsonlBaseline: number
    baselineMessagesTotal: number
  } {
    const jsonlContent = this.infra.readJsonlContent(jsonlPath)
    return {
      jsonlBaseline: jsonlContent.split('\n').filter((l) => l.trim()).length,
      baselineMessagesTotal: computeMessagesTotalFromContent(jsonlContent)
    }
  }

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
    const jsonlPath = this.infra.resolveJsonlPath(baselineSessionId, baselineWorkingDir)
    // readJsonlContent can return a large string for long sessions. Extract the
    // scalar values here via a helper so jsonlContent is never a local variable
    // of dispatch itself — async continuations keep all locals alive across
    // every await inside the for-await loop below.
    const { jsonlBaseline, baselineMessagesTotal } = this.readBaselines(jsonlPath)

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

    const parsed = finalizeParseState(state, jsonlBaseline)
    const messagesTotal =
      baselineMessagesTotal + 1 + state.assistantEventCount + 2 * state.toolCallCount
    return { ...parsed, messages_total: messagesTotal }
  }
}
