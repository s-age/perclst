import { ClaudeCodeInfra } from '@src/infrastructures/claudeCode'
import {
  parseStreamEvents,
  classifyExitError,
  emitStreamEvents
} from '@src/repositories/parsers/claudeCodeParser'
import type { IClaudeCodeRepository } from '@src/repositories/ports/agent'
import { RawExitError } from '@src/errors/rawExitError'
import type { ClaudeAction, RawOutput } from '@src/types/claudeCode'
import type { AgentStreamEvent } from '@src/types/agent'

export class ClaudeCodeRepository implements IClaudeCodeRepository {
  private infra = new ClaudeCodeInfra()

  async dispatch(
    action: ClaudeAction,
    onStreamEvent?: (event: AgentStreamEvent) => void
  ): Promise<RawOutput> {
    const args = this.infra.buildArgs(action)

    const baselineSessionId =
      action.type === 'fork' ? action.originalClaudeSessionId : action.sessionId
    const baselineWorkingDir =
      action.type === 'fork' ? action.originalWorkingDir : action.workingDir
    const jsonlBaseline = this.infra.countJsonlLines(
      this.infra.resolveJsonlPath(baselineSessionId, baselineWorkingDir)
    )

    const lines: string[] = []
    const toolNameMap = new Map<string, string>()

    try {
      for await (const line of this.infra.runClaude(
        args,
        action.prompt,
        action.workingDir,
        action.sessionFilePath
      )) {
        lines.push(line)
        if (onStreamEvent) emitStreamEvents(line, toolNameMap, onStreamEvent)
      }
    } catch (err) {
      if (err instanceof RawExitError) classifyExitError(err)
      throw err
    }

    return parseStreamEvents(lines, jsonlBaseline)
  }
}
