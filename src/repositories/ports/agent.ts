import type { ClaudeAction, RawOutput } from '@src/types/claudeCode'
import type { AgentStreamEvent } from '@src/types/agent'

export type IProcedureRepository = {
  load(name: string): string
  exists(name: string): boolean
}

export type IClaudeCodeRepository = {
  dispatch(
    action: ClaudeAction,
    onStreamEvent?: (event: AgentStreamEvent) => void
  ): Promise<RawOutput>
}
