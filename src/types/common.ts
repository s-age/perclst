export type ThinkingBlock = {
  type: 'thinking'
  thinking: string
}

export type ToolUseRecord = {
  id: string
  name: string
  input: unknown
  result?: string
}
