export type ToolCall = {
  name: string
  input: Record<string, unknown>
  result: string | null
  isError: boolean
}

export type ClaudeCodeTurn = {
  userMessage?: string
  toolCalls: ToolCall[]
  assistantText?: string
  thinkingBlocks?: string[]
  usage?: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens: number
    cache_creation_input_tokens: number
  }
}

export type TurnRow = { n: number; role: string; content: string }

export type RowFilter = {
  head?: number
  tail?: number
  order?: 'asc' | 'desc'
}

export function flattenTurns(turns: ClaudeCodeTurn[]): TurnRow[] {
  const rows: TurnRow[] = []
  let n = 1

  for (const turn of turns) {
    if (turn.userMessage !== undefined) {
      rows.push({ n: n++, role: 'user', content: turn.userMessage })
    }

    for (const block of turn.thinkingBlocks ?? []) {
      rows.push({ n: n++, role: 'thinking', content: block })
    }

    for (const tool of turn.toolCalls) {
      const inputStr = JSON.stringify(tool.input)
      rows.push({ n: n++, role: 'tool_use', content: `${tool.name}  ${inputStr}` })
      if (tool.result !== null) {
        rows.push({ n: n++, role: 'tool_result', content: tool.result })
      }
    }

    if (turn.assistantText !== undefined) {
      rows.push({ n: n++, role: 'assistant', content: turn.assistantText })
    }
  }

  return rows
}

export function applyRowFilter(rows: TurnRow[], filter: RowFilter): TurnRow[] {
  let result = rows
  if (filter.tail !== undefined) result = result.slice(-filter.tail)
  if (filter.head !== undefined) result = result.slice(0, filter.head)
  if (filter.order === 'desc') result = [...result].reverse()
  return result
}
