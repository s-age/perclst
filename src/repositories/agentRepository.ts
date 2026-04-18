import { ClaudeCodeInfra } from '@src/infrastructures/claudeCode'
import { parseStreamEvents } from '@src/repositories/parsers/claudeCodeParser'
import type { IClaudeCodeRepository } from '@src/repositories/ports/agent'
import type { ClaudeAction, RawOutput } from '@src/types/claudeCode'

export class ClaudeCodeRepository implements IClaudeCodeRepository {
  private infra = new ClaudeCodeInfra()

  async dispatch(action: ClaudeAction): Promise<RawOutput> {
    const args = this.infra.buildArgs(action)

    const baselineSessionId =
      action.type === 'fork' ? action.originalClaudeSessionId : action.sessionId
    const baselineWorkingDir =
      action.type === 'fork' ? action.originalWorkingDir : action.workingDir
    const jsonlBaseline = this.infra.countJsonlLines(
      this.infra.resolveJsonlPath(baselineSessionId, baselineWorkingDir)
    )

    const lines: string[] = []
    for await (const line of this.infra.runClaude(
      args,
      action.prompt,
      action.workingDir,
      action.sessionFilePath
    )) {
      lines.push(line)
    }

    return parseStreamEvents(lines, jsonlBaseline)
  }
}
