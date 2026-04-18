import type { ClaudeAction, RawOutput } from '@src/types/claudeCode'

export type IProcedureRepository = {
  load(name: string): string
  exists(name: string): boolean
}

export type IClaudeCodeRepository = {
  dispatch(action: ClaudeAction): Promise<RawOutput>
}
