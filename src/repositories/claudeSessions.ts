import { join } from 'path'
import { readFileSync, readdirSync, existsSync, statSync } from 'fs'
import type { AnalysisSummary, AssistantTurnEntry } from '@src/types/analysis'
import type { IClaudeSessionRepository } from '@src/repositories/ports/analysis'
import { fileExists, homeDir } from '@src/infrastructures/fs'
import {
  parseRawEntries,
  buildToolResultMap,
  buildTurns,
  buildSummaryStats,
  filterEntriesUpTo,
  type RawAssistantEntry
} from '@src/repositories/parsers/claudeSessionParser'

function encodeWorkingDir(workingDir: string): string {
  return workingDir.replace(/\//g, '-')
}

function resolveJsonlPath(claudeSessionId: string, workingDir: string): string {
  const encoded = encodeWorkingDir(workingDir)
  return join(homeDir(), '.claude', 'projects', encoded, `${claudeSessionId}.jsonl`)
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
