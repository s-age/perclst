import { join } from '@src/utils/path'
import type { ClaudeCodeInfra } from '@src/infrastructures/claudeCode'
import type { FsInfra } from '@src/infrastructures/fs'
import {
  createParseState,
  processLine,
  finalizeParseState,
  emitStreamEvents
} from '@src/repositories/parsers/claudeCodeParser'
import { computeBaselinesFromContent } from '@src/repositories/parsers/claudeSessionScanner'
import type { IClaudeCodeRepository } from '@src/repositories/ports/agent'
import { RawExitError } from '@src/errors/rawExitError'
import { APIError } from '@src/errors/apiError'
import { RateLimitError } from '@src/errors/rateLimitError'
import type { ClaudeAction, RawOutput } from '@src/types/claudeCode'
import type { AgentStreamEvent } from '@src/types/agent'

type AgentRepoFs = Pick<FsInfra, 'homeDir'>

export function buildArgs(action: ClaudeAction): string[] {
  const args: string[] = ['-p', '--output-format', 'stream-json', '--verbose']
  if (action.model) args.push('--model', action.model)
  if (action.type === 'resume') {
    args.push('--resume', action.sessionId)
  } else if (action.type === 'fork') {
    args.push('--resume', action.originalClaudeSessionId)
    args.push('--fork-session')
    args.push('--session-id', action.sessionId)
    if (action.resumeSessionAt) args.push('--resume-session-at', action.resumeSessionAt)
  } else {
    args.push('--session-id', action.sessionId)
    if (action.system) args.push('--system-prompt', action.system)
  }
  if (action.allowedTools?.length) args.push('--allowedTools', ...action.allowedTools)
  if (action.disallowedTools?.length) args.push('--disallowedTools', ...action.disallowedTools)
  return args
}

export class ClaudeCodeRepository implements IClaudeCodeRepository {
  constructor(
    private infra: ClaudeCodeInfra,
    private fs: AgentRepoFs
  ) {}

  private readBaselines(jsonlPath: string): {
    jsonlBaseline: number
    baselineMessagesTotal: number
  } {
    const jsonlContent = this.infra.readJsonlContent(jsonlPath)
    const { lineCount, messagesTotal } = computeBaselinesFromContent(jsonlContent)
    return { jsonlBaseline: lineCount, baselineMessagesTotal: messagesTotal }
  }

  private classifyExitError(err: RawExitError): never {
    const { code, stderr } = err
    const rateLimitMatch = stderr.match(/resets?\s+([^\n\r]+)/i)
    if (
      stderr.toLowerCase().includes("you've hit your limit") ||
      stderr.toLowerCase().includes('you have hit your limit')
    ) {
      throw new RateLimitError(rateLimitMatch?.[1]?.trim())
    }
    if (stderr) this.infra.writeStderr(stderr)
    throw new APIError(`claude exited with code ${code}`)
  }

  private resolveJsonlPath(sessionId: string, workingDir: string): string {
    const encoded = workingDir.replace(/\//g, '-')
    return join(this.fs.homeDir(), '.claude', 'projects', encoded, `${sessionId}.jsonl`)
  }

  spawnInteractive(args: string[]): void {
    this.infra.spawnInteractive(args)
  }

  async dispatch(
    action: ClaudeAction,
    onStreamEvent?: (event: AgentStreamEvent) => void,
    signal?: AbortSignal
  ): Promise<RawOutput> {
    const args = buildArgs(action)

    const baselineSessionId =
      action.type === 'fork' ? action.originalClaudeSessionId : action.sessionId
    const baselineWorkingDir =
      action.type === 'fork' ? action.originalWorkingDir : action.workingDir
    const jsonlPath = this.resolveJsonlPath(baselineSessionId, baselineWorkingDir)
    // readJsonlContent can return a large string for long sessions. Extract the
    // scalar values here via a helper so jsonlContent is never a local variable
    // of dispatch itself — async continuations keep all locals alive across
    // every await inside the for-await loop below.
    const { jsonlBaseline, baselineMessagesTotal } = this.readBaselines(jsonlPath)

    const state = createParseState()
    const toolNameMap = new Map<string, string>()

    try {
      for await (const line of this.infra.runClaude(
        args,
        action.prompt,
        action.workingDir,
        { sessionFilePath: action.sessionFilePath, sessionId: action.sessionId },
        signal
      )) {
        processLine(state, line)
        if (onStreamEvent) emitStreamEvents(line, toolNameMap, onStreamEvent)
      }
    } catch (err) {
      if (err instanceof RawExitError) this.classifyExitError(err)
      throw err
    }

    const parsed = finalizeParseState(state, jsonlBaseline)
    const messagesTotal =
      baselineMessagesTotal + 1 + state.assistantEventCount + 2 * state.toolCallCount
    return { ...parsed, messages_total: messagesTotal }
  }
}
