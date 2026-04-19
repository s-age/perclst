import type { Session } from './session.js'

export type AssistantTurnEntry = { uuid: string; text: string }

export type RewindTurn = { index: number; uuid: string; text: string }

export type AnalyzeResult = {
  session: Session
  summary: AnalysisSummary
}

export type ToolCall = {
  name: string
  input: Record<string, unknown>
  result: string | null // null for tool_reference type (ToolSearch)
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

export type AnalysisSummary = {
  turns: ClaudeCodeTurn[]
  turnsBreakdown: {
    userInstructions: number
    thinking: number
    toolCalls: number
    toolResults: number
    assistantResponse: number
    total: number
  }
  toolUses: Array<{ name: string; input: Record<string, unknown>; isError: boolean }>
  tokens: {
    /** Sum of input_tokens across all API calls (matches printResponse) */
    totalInput: number
    /** Sum of output_tokens across all API calls */
    totalOutput: number
    /** Sum of cache_read_input_tokens across all API calls */
    totalCacheRead: number
    /** Sum of cache_creation_input_tokens across all API calls */
    totalCacheCreation: number
  }
}
