import { join } from 'path'
import { readFileSync, readdirSync, existsSync, statSync } from 'fs'
import type {
  AnalysisSummary,
  AssistantTurnEntry,
  ClaudeCodeTurn,
  ToolCall
} from '@src/types/analysis'
import type { IClaudeSessionRepository } from '@src/repositories/ports/analysis'
import { fileExists, homeDir } from '@src/infrastructures/fs'

type RawUserEntry = {
  type: 'user'
  message: {
    content: string | RawContentBlock[]
  }
}

type RawAssistantEntry = {
  type: 'assistant'
  uuid: string
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
  return join(homeDir(), '.claude', 'projects', encoded, `${claudeSessionId}.jsonl`)
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

type TokenTotals = {
  totalInput: number
  totalOutput: number
  totalCacheRead: number
  totalCacheCreation: number
}

function parseRawEntries(raw: string): RawEntry[] {
  return raw
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as RawEntry)
}

function buildToolResultMap(
  entries: RawEntry[]
): Map<string, { text: string | null; isError: boolean }> {
  const map = new Map<string, { text: string | null; isError: boolean }>()
  for (const entry of entries) {
    if (entry.type !== 'user') continue
    const userEntry = entry as RawUserEntry
    const content = userEntry.message.content
    if (!Array.isArray(content)) continue
    for (const block of content) {
      if (block.type === 'tool_result') {
        map.set(block.tool_use_id, {
          text: extractToolResultText(block.content),
          isError: block.is_error ?? false
        })
      }
    }
  }
  return map
}

function processAssistantEntry(
  entry: RawAssistantEntry,
  toolResultMap: Map<string, { text: string | null; isError: boolean }>
): { turn: ClaudeCodeTurn; tokenDeltas: TokenTotals } | null {
  const content = entry.message.content ?? []
  if (content.length > 0 && content.every((b) => b.type === 'thinking')) return null

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

  const u = entry.message.usage
  const inp = u?.input_tokens ?? 0
  const out = u?.output_tokens ?? 0
  const cr = u?.cache_read_input_tokens ?? 0
  const cc = u?.cache_creation_input_tokens ?? 0
  const usage: ClaudeCodeTurn['usage'] | undefined = u
    ? {
        input_tokens: inp,
        output_tokens: out,
        cache_read_input_tokens: cr,
        cache_creation_input_tokens: cc
      }
    : undefined

  return {
    turn: {
      toolCalls,
      assistantText: assistantText?.trim() || undefined,
      thinkingBlocks: thinkingBlocks.length > 0 ? thinkingBlocks : undefined,
      usage
    },
    tokenDeltas: { totalInput: inp, totalOutput: out, totalCacheRead: cr, totalCacheCreation: cc }
  }
}

function buildTurns(
  entries: RawEntry[],
  toolResultMap: Map<string, { text: string | null; isError: boolean }>
): { turns: ClaudeCodeTurn[]; tokens: TokenTotals } {
  const turns: ClaudeCodeTurn[] = []
  let totalInput = 0
  let totalOutput = 0
  let totalCacheRead = 0
  let totalCacheCreation = 0

  for (const entry of entries) {
    if (entry.type === 'user') {
      const content = (entry as RawUserEntry).message.content
      if (typeof content === 'string') {
        turns.push({ userMessage: content, toolCalls: [] })
      } else if (Array.isArray(content) && !content.some((b) => b.type === 'tool_result')) {
        const texts = content
          .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
          .map((b) => b.text)
        if (texts.length > 0) turns.push({ userMessage: texts.join('\n'), toolCalls: [] })
      }
    } else if (entry.type === 'assistant') {
      const result = processAssistantEntry(entry as RawAssistantEntry, toolResultMap)
      if (result) {
        turns.push(result.turn)
        totalInput += result.tokenDeltas.totalInput
        totalOutput += result.tokenDeltas.totalOutput
        totalCacheRead += result.tokenDeltas.totalCacheRead
        totalCacheCreation += result.tokenDeltas.totalCacheCreation
      }
    }
  }

  return { turns, tokens: { totalInput, totalOutput, totalCacheRead, totalCacheCreation } }
}

function buildSummaryStats(turns: ClaudeCodeTurn[]): {
  turnsBreakdown: AnalysisSummary['turnsBreakdown']
  toolUses: AnalysisSummary['toolUses']
} {
  let userInstructions = 0
  let toolUse = 0
  let assistantResponse = 0
  const allToolUses: AnalysisSummary['toolUses'] = []

  for (const turn of turns) {
    if (turn.userMessage !== undefined) userInstructions++
    if (turn.assistantText !== undefined || turn.toolCalls.length > 0) assistantResponse++
    toolUse += turn.toolCalls.length
    for (const tc of turn.toolCalls) {
      allToolUses.push({ name: tc.name, input: tc.input, isError: tc.isError })
    }
  }

  return {
    turnsBreakdown: {
      userInstructions,
      toolUse,
      assistantResponse,
      total: userInstructions + toolUse * 2 + assistantResponse
    },
    toolUses: allToolUses
  }
}

/**
 * Decode an encoded project directory name back to an absolute working directory path.
 * The encoding is `workingDir.replace(/\//g, '-')`, so `-` can be either `/` or a literal `-`.
 * This function searches the real filesystem to resolve the ambiguity.
 *
 * Returns the decoded path, or null if no unique real path can be found.
 * `ambiguous` is true when multiple valid paths exist (caller should require --cwd).
 */
export class ClaudeSessionRepository implements IClaudeSessionRepository {
  findEncodedDirBySessionId(claudeSessionId: string): string {
    return findEncodedDirBySessionId(claudeSessionId)
  }

  decodeWorkingDir(encoded: string): { path: string | null; ambiguous: boolean } {
    return decodeWorkingDir(encoded)
  }

  validateSessionAtDir(claudeSessionId: string, workingDir: string): void {
    validateSessionAtDir(claudeSessionId, workingDir)
  }

  readSession(
    claudeSessionId: string,
    workingDir: string,
    upToMessageId?: string
  ): AnalysisSummary {
    return readClaudeSession(claudeSessionId, workingDir, upToMessageId)
  }

  getAssistantTurns(claudeSessionId: string, workingDir: string): AssistantTurnEntry[] {
    return getAssistantTurns(claudeSessionId, workingDir)
  }
}

export function decodeWorkingDir(encoded: string): { path: string | null; ambiguous: boolean } {
  if (!encoded.startsWith('-')) return { path: null, ambiguous: false }

  const parts = encoded.slice(1).split('-') // strip leading '-', split on remaining '-'
  const results: string[] = []

  function search(partIdx: number, current: string): void {
    if (partIdx >= parts.length) {
      results.push(current)
      return
    }
    let component = ''
    for (let i = partIdx; i < parts.length; i++) {
      component = component ? `${component}-${parts[i]}` : parts[i]
      const candidate = join(current, component)
      try {
        if (existsSync(candidate) && statSync(candidate).isDirectory()) {
          search(i + 1, candidate)
        }
      } catch {
        // ignore permission errors
      }
    }
  }

  search(0, '/')

  if (results.length === 1) return { path: results[0], ambiguous: false }
  if (results.length > 1) return { path: null, ambiguous: true }
  return { path: null, ambiguous: false }
}

/**
 * Search `~/.claude/projects/` for a JSONL file matching the given Claude Code session ID.
 * Returns the encoded project directory name, or throws if not found / ambiguous.
 */
export function findEncodedDirBySessionId(claudeSessionId: string): string {
  const projectsDir = join(homeDir(), '.claude', 'projects')
  if (!existsSync(projectsDir)) {
    throw new Error(`Claude Code projects directory not found: ${projectsDir}`)
  }

  const matches: string[] = []
  for (const entry of readdirSync(projectsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const jsonlPath = join(projectsDir, entry.name, `${claudeSessionId}.jsonl`)
    if (existsSync(jsonlPath)) {
      matches.push(entry.name)
    }
  }

  if (matches.length === 0) {
    throw new Error(`Claude Code session not found: ${claudeSessionId}`)
  }
  if (matches.length > 1) {
    throw new Error(
      `Session ID ${claudeSessionId} exists in multiple project directories.\n` +
        `Use --cwd to specify the working directory.`
    )
  }
  return matches[0]
}

/**
 * Validate that a Claude Code session JSONL file exists at the given working directory.
 * Throws if the file is not found.
 */
export function validateSessionAtDir(claudeSessionId: string, workingDir: string): void {
  const jsonlPath = resolveJsonlPath(claudeSessionId, workingDir)
  if (!existsSync(jsonlPath)) {
    throw new Error(`Claude Code session not found: ${jsonlPath}`)
  }
}

export function getAssistantTurns(
  claudeSessionId: string,
  workingDir: string
): AssistantTurnEntry[] {
  const jsonlPath = resolveJsonlPath(claudeSessionId, workingDir)
  if (!fileExists(jsonlPath)) {
    throw new Error(`Claude Code session file not found: ${jsonlPath}`)
  }

  const entries = parseRawEntries(readFileSync(jsonlPath, 'utf-8'))
  const result: AssistantTurnEntry[] = []

  for (const entry of entries) {
    if (entry.type !== 'assistant') continue
    const assistantEntry = entry as RawAssistantEntry
    const content = assistantEntry.message.content ?? []
    if (content.length > 0 && content.every((b) => b.type === 'thinking')) continue
    const text = content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map((b) => b.text)
      .join(' ')
      .trim()
    if (!text) continue
    result.push({ uuid: assistantEntry.uuid, text })
  }

  return result
}

function filterEntriesUpTo(entries: RawEntry[], messageId: string): RawEntry[] {
  const cutoffIdx = entries.findIndex(
    (e) => e.type === 'assistant' && (e as RawAssistantEntry).uuid === messageId
  )
  if (cutoffIdx === -1) return entries
  // Include the tool_result user entry immediately following the cutoff, if present
  let end = cutoffIdx + 1
  if (end < entries.length && entries[end].type === 'user') {
    const content = (entries[end] as RawUserEntry).message.content
    if (Array.isArray(content) && content.some((b) => b.type === 'tool_result')) {
      end++
    }
  }
  return entries.slice(0, end)
}

export function readClaudeSession(
  claudeSessionId: string,
  workingDir: string,
  upToMessageId?: string
): AnalysisSummary {
  const jsonlPath = resolveJsonlPath(claudeSessionId, workingDir)

  if (!fileExists(jsonlPath)) {
    throw new Error(`Claude Code session file not found: ${jsonlPath}`)
  }

  let entries = parseRawEntries(readFileSync(jsonlPath, 'utf-8'))
  if (upToMessageId) {
    entries = filterEntriesUpTo(entries, upToMessageId)
  }
  const toolResultMap = buildToolResultMap(entries)
  const { turns, tokens } = buildTurns(entries, toolResultMap)
  const { turnsBreakdown, toolUses } = buildSummaryStats(turns)

  return { turns, turnsBreakdown, toolUses, tokens }
}
