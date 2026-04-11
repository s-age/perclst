export interface ThinkingBlock {
  type: 'thinking'
  thinking: string
}

export interface ToolUseRecord {
  id: string
  name: string
  input: unknown
  result?: string
}
