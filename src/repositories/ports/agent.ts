import type { ClaudeAction, RawOutput } from '@src/types/claudeCode'
import type { AgentStreamEvent } from '@src/types/agent'

export type IProcedureRepository = {
  load(name: string, workingDir?: string): string
}

export type IClaudeCodeRepository = {
  dispatch(
    action: ClaudeAction,
    onStreamEvent?: (event: AgentStreamEvent) => void,
    signal?: AbortSignal
  ): Promise<RawOutput>
  spawnInteractive(args: string[]): void
}
