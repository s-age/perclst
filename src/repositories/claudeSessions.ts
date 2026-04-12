import { join } from 'path'
import { homedir } from 'os'
import { readFileSync } from 'fs'
import type { AnalysisSummary, ClaudeCodeTurn, ToolCall } from '@src/types/analysis'
import { fileExists } from '@src/infrastructures/fs'

type RawUserEntry = {
  type: 'user'
  message: {
    content: string | RawContentBlock[]
  }
}

type RawAssistantEntry = {
  type: 'assistant'
  message: {
    content: RawContentBlock[]
    usage?: {
      input_tokens?: number
      output_tokens?: number
      cache_read_input_tokens?: number
      cache_creation_input_tokens?: number
    }
  }
}

type RawContentBlock =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | {
      type: 'tool_result'
      tool_use_id: string
      content: string | RawContentBlock[]
      is_error?: boolean
    }
  | { type: 'tool_reference'; id: string }

type RawEntry = RawUserEntry | RawAssistantEntry | { type: string }

function encodeWorkingDir(workingDir: string): string {
  return workingDir.replace(/\//g, '-')
}

function resolveJsonlPath(claudeSessionId: string, workingDir: string): string {
  const encoded = encodeWorkingDir(workingDir)
  return join(homedir(), '.claude', 'projects', encoded, `${claudeSessionId}.jsonl`)
}

function extractToolResultText(content: string | RawContentBlock[]): string | null {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    const texts = content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map((b) => b.text)
    return texts.length > 0 ? texts.join('\n') : null
  }
  return null
}

export function readClaudeSession(claudeSessionId: string, workingDir: string): AnalysisSummary {
  const jsonlPath = resolveJsonlPath(claudeSessionId, workingDir)

  if (!fileExists(jsonlPath)) {
    throw new Error(`Claude Code session file not found: ${jsonlPath}`)
  }

  const raw = readFileSync(jsonlPath, 'utf-8')
  const entries: RawEntry[] = raw
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as RawEntry)

  const turns: ClaudeCodeTurn[] = []

  const toolResultMap = new Map<string, { text: string | null; isError: boolean }>()
  for (const entry of entries) {
    if (entry.type !== 'user') continue
    const userEntry = entry as RawUserEntry
    const content = userEntry.message.content
    if (!Array.isArray(content)) continue
    for (const block of content) {
      if (block.type === 'tool_result') {
        toolResultMap.set(block.tool_use_id, {
          text: extractToolResultText(block.content),
          isError: block.is_error ?? false
        })
      }
    }
  }

  let totalInput = 0
  let totalOutput = 0
  let totalCacheRead = 0
  let totalCacheCreation = 0

  for (const entry of entries) {
    if (entry.type === 'user') {
      const userEntry = entry as RawUserEntry
      const content = userEntry.message.content
      if (typeof content === 'string') {
        turns.push({ userMessage: content, toolCalls: [] })
      } else if (Array.isArray(content)) {
        const hasToolResult = content.some((b) => b.type === 'tool_result')
        if (!hasToolResult) {
          const texts = content
            .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
            .map((b) => b.text)
          if (texts.length > 0) {
            turns.push({ userMessage: texts.join('\n'), toolCalls: [] })
          }
        }
      }
    } else if (entry.type === 'assistant') {
      const asstEntry = entry as RawAssistantEntry
      const content = asstEntry.message.content ?? []

      if (content.length > 0 && content.every((b) => b.type === 'thinking')) continue

      const thinkingBlocks: string[] = []
      const toolCalls: ToolCall[] = []
      let assistantText: string | undefined

      for (const block of content) {
        if (block.type === 'thinking') {
          thinkingBlocks.push(block.thinking)
        } else if (block.type === 'text') {
          assistantText = (assistantText ?? '') + block.text
        } else if (block.type === 'tool_use') {
          const mapped = toolResultMap.get(block.id)
          toolCalls.push({
            name: block.name,
            input: block.input,
            result: mapped?.text ?? null,
            isError: mapped?.isError ?? false
          })
        }
      }

      const u = asstEntry.message.usage
      let usage: ClaudeCodeTurn['usage'] | undefined
      if (u) {
        const inp = u.input_tokens ?? 0
        const out = u.output_tokens ?? 0
        const cr = u.cache_read_input_tokens ?? 0
        const cc = u.cache_creation_input_tokens ?? 0
        usage = {
          input_tokens: inp,
          output_tokens: out,
          cache_read_input_tokens: cr,
          cache_creation_input_tokens: cc
        }
        totalInput += inp
        totalOutput += out
        totalCacheRead += cr
        totalCacheCreation += cc
      }

      turns.push({
        toolCalls,
        assistantText: assistantText?.trim() || undefined,
        thinkingBlocks: thinkingBlocks.length > 0 ? thinkingBlocks : undefined,
        usage
      })
    }
  }

  let userInstructions = 0
  let toolUse = 0
  let assistantResponse = 0
  const allToolUses: Array<{ name: string; input: Record<string, unknown>; isError: boolean }> = []

  for (const turn of turns) {
    if (turn.userMessage !== undefined) userInstructions++
    if (turn.assistantText !== undefined || turn.toolCalls.length > 0) assistantResponse++
    toolUse += turn.toolCalls.length
    for (const tc of turn.toolCalls) {
      allToolUses.push({ name: tc.name, input: tc.input, isError: tc.isError })
    }
  }

  return {
    turns,
    turnsBreakdown: {
      userInstructions,
      toolUse,
      assistantResponse,
      total: userInstructions + toolUse * 2 + assistantResponse
    },
    toolUses: allToolUses,
    tokens: { totalInput, totalOutput, totalCacheRead, totalCacheCreation }
  }
}
