import { join } from 'path'
import type { AssistantTurnEntry, ClaudeSessionData } from '@src/types/analysis'
import type { IClaudeSessionRepository } from '@src/repositories/ports/analysis'
import { fileExists, homeDir, readText, listDirEntries, isDirectory } from '@src/infrastructures/fs'
import {
  parseRawEntries,
  buildToolResultMap,
  buildTurns,
  filterEntriesUpTo,
  type RawAssistantEntry
} from '@src/repositories/parsers/claudeSessionParser'

const MAX_SANITIZED_LENGTH = 200

function djb2Hash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return hash
}

/**
 * Mirrors Claude Code's sanitizePath: replaces all non-alphanumeric chars with
 * hyphens, then truncates at 200 chars with a hash suffix for long paths.
 * Claude Code runs under Bun and uses Bun.hash for the suffix; we use djb2
 * (Node-stable). For paths > 200 chars, resolveProjectDir does a prefix scan
 * so the hash mismatch is handled there.
 */
function sanitizeProjectDir(workingDir: string): string {
  const sanitized = workingDir.replace(/[^a-zA-Z0-9]/g, '-')
  if (sanitized.length <= MAX_SANITIZED_LENGTH) return sanitized
  const hash = Math.abs(djb2Hash(workingDir)).toString(36)
  return `${sanitized.slice(0, MAX_SANITIZED_LENGTH)}-${hash}`
}

/**
 * Resolves the on-disk project directory for a given working dir path.
 * For short paths, returns the exact sanitized name.
 * For long paths (> 200 chars), falls back to prefix scan because Claude Code
 * uses Bun.hash while we use djb2 — the suffix will differ.
 */
function resolveProjectDir(workingDir: string): string {
  const projectsDir = join(homeDir(), '.claude', 'projects')
  const sanitized = workingDir.replace(/[^a-zA-Z0-9]/g, '-')

  if (sanitized.length <= MAX_SANITIZED_LENGTH) {
    return join(projectsDir, sanitized)
  }

  const prefix = sanitized.slice(0, MAX_SANITIZED_LENGTH)
  if (fileExists(projectsDir)) {
    const match = listDirEntries(projectsDir).find(
      (d) => d.isDirectory() && d.name.startsWith(prefix + '-')
    )
    if (match) return join(projectsDir, match.name)
  }
  // Fall back to our own hash if no match found on disk
  return join(projectsDir, sanitizeProjectDir(workingDir))
}

function resolveJsonlPath(claudeSessionId: string, workingDir: string): string {
  return join(resolveProjectDir(workingDir), `${claudeSessionId}.jsonl`)
}

/**
 * Decode an encoded project directory name back to an absolute working directory path.
 * Claude Code encodes by replacing all non-alphanumeric chars with `-`, so a `-` in
 * the encoded name can represent `/`, `_`, `.`, or any other non-alphanumeric char.
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
  ): ClaudeSessionData {
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
        if (fileExists(candidate) && isDirectory(candidate)) {
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
  if (!fileExists(projectsDir)) {
    throw new Error(`Claude Code projects directory not found: ${projectsDir}`)
  }

  const matches: string[] = []
  for (const entry of listDirEntries(projectsDir)) {
    if (!entry.isDirectory()) continue
    const jsonlPath = join(projectsDir, entry.name, `${claudeSessionId}.jsonl`)
    if (fileExists(jsonlPath)) {
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
  if (!fileExists(jsonlPath)) {
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

  const entries = parseRawEntries(readText(jsonlPath))
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
): ClaudeSessionData {
  const jsonlPath = resolveJsonlPath(claudeSessionId, workingDir)

  if (!fileExists(jsonlPath)) {
    throw new Error(`Claude Code session file not found: ${jsonlPath}`)
  }

  let entries = parseRawEntries(readText(jsonlPath))
  if (upToMessageId) {
    entries = filterEntriesUpTo(entries, upToMessageId)
  }
  const toolResultMap = buildToolResultMap(entries)
  const { turns, tokens, contextWindow } = buildTurns(entries, toolResultMap)

  return { turns, tokens: { ...tokens, contextWindow } }
}
