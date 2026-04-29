import { join } from '@src/utils/path'
import type { AssistantTurnEntry, ClaudeSessionData, SessionStats } from '@src/types/analysis'
import type { IClaudeSessionRepository } from '@src/repositories/ports/analysis'
import type { FsInfra } from '@src/infrastructures/fs'
import {
  createSessionReadState,
  processSessionReadLine,
  finalizeSessionRead,
  createStatsScanState,
  processStatsScanLine,
  finalizeStatsScan,
  createAssistantTurnState,
  processAssistantTurnLine,
  finalizeAssistantTurns
} from '@src/repositories/parsers/claudeSessionScanner'

const MAX_SANITIZED_LENGTH = 200

type ClaudeSessionFs = Pick<
  FsInfra,
  'homeDir' | 'fileExists' | 'listDirEntries' | 'isDirectory' | 'readLines'
>

function djb2Hash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return hash
}

function sanitizeProjectDir(workingDir: string): string {
  const sanitized = workingDir.replace(/[^a-zA-Z0-9]/g, '-')
  if (sanitized.length <= MAX_SANITIZED_LENGTH) return sanitized
  const hash = Math.abs(djb2Hash(workingDir)).toString(36)
  return `${sanitized.slice(0, MAX_SANITIZED_LENGTH)}-${hash}`
}

export class ClaudeSessionRepository implements IClaudeSessionRepository {
  constructor(private fs: ClaudeSessionFs) {}

  private resolveProjectDir(workingDir: string): string {
    const projectsDir = join(this.fs.homeDir(), '.claude', 'projects')
    const sanitized = workingDir.replace(/[^a-zA-Z0-9]/g, '-')
    if (sanitized.length <= MAX_SANITIZED_LENGTH) {
      return join(projectsDir, sanitized)
    }
    const prefix = sanitized.slice(0, MAX_SANITIZED_LENGTH)
    if (this.fs.fileExists(projectsDir)) {
      const match = this.fs
        .listDirEntries(projectsDir)
        .find((d) => d.isDirectory() && d.name.startsWith(prefix + '-'))
      if (match) return join(projectsDir, match.name)
    }
    return join(projectsDir, sanitizeProjectDir(workingDir))
  }

  private resolveJsonlPath(claudeSessionId: string, workingDir: string): string {
    return join(this.resolveProjectDir(workingDir), `${claudeSessionId}.jsonl`)
  }

  findEncodedDirBySessionId(claudeSessionId: string): string {
    const projectsDir = join(this.fs.homeDir(), '.claude', 'projects')
    if (!this.fs.fileExists(projectsDir)) {
      throw new Error(`Claude Code projects directory not found: ${projectsDir}`)
    }
    const matches: string[] = []
    for (const entry of this.fs.listDirEntries(projectsDir)) {
      if (!entry.isDirectory()) continue
      const jsonlPath = join(projectsDir, entry.name, `${claudeSessionId}.jsonl`)
      if (this.fs.fileExists(jsonlPath)) matches.push(entry.name)
    }
    if (matches.length === 0) throw new Error(`Claude Code session not found: ${claudeSessionId}`)
    if (matches.length > 1) {
      throw new Error(
        `Session ID ${claudeSessionId} exists in multiple project directories.\n` +
          `Use --cwd to specify the working directory.`
      )
    }
    return matches[0]
  }

  decodeWorkingDir(encoded: string): { path: string | null; ambiguous: boolean } {
    if (!encoded.startsWith('-')) return { path: null, ambiguous: false }
    const parts = encoded.slice(1).split('-')
    const results: string[] = []
    const fsRef = this.fs

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
          if (fsRef.fileExists(candidate) && fsRef.isDirectory(candidate)) {
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

  validateSessionAtDir(claudeSessionId: string, workingDir: string): void {
    const jsonlPath = this.resolveJsonlPath(claudeSessionId, workingDir)
    if (!this.fs.fileExists(jsonlPath)) {
      throw new Error(`Claude Code session not found: ${jsonlPath}`)
    }
  }

  async readSession(
    claudeSessionId: string,
    workingDir: string,
    upToMessageId?: string
  ): Promise<ClaudeSessionData> {
    const jsonlPath = this.resolveJsonlPath(claudeSessionId, workingDir)
    if (!this.fs.fileExists(jsonlPath)) {
      throw new Error(`Claude Code session file not found: ${jsonlPath}`)
    }
    const state = createSessionReadState(upToMessageId)
    for await (const line of this.fs.readLines(jsonlPath)) {
      if (processSessionReadLine(state, line)) break
    }
    const { turns, tokens, contextWindow } = finalizeSessionRead(state)
    return { turns, tokens: { ...tokens, contextWindow } }
  }

  async scanSessionStats(
    claudeSessionId: string,
    workingDir: string,
    upToMessageId?: string
  ): Promise<SessionStats> {
    const jsonlPath = this.resolveJsonlPath(claudeSessionId, workingDir)
    if (!this.fs.fileExists(jsonlPath)) {
      throw new Error(`Claude Code session file not found: ${jsonlPath}`)
    }
    const state = createStatsScanState(upToMessageId)
    for await (const line of this.fs.readLines(jsonlPath)) {
      if (processStatsScanLine(state, line)) break
    }
    return finalizeStatsScan(state)
  }

  async getAssistantTurns(
    claudeSessionId: string,
    workingDir: string
  ): Promise<AssistantTurnEntry[]> {
    const jsonlPath = this.resolveJsonlPath(claudeSessionId, workingDir)
    if (!this.fs.fileExists(jsonlPath)) {
      throw new Error(`Claude Code session file not found: ${jsonlPath}`)
    }
    const state = createAssistantTurnState()
    for await (const line of this.fs.readLines(jsonlPath)) {
      processAssistantTurnLine(state, line)
    }
    return finalizeAssistantTurns(state)
  }
}
