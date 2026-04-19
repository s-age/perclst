import { ClaudeCodeInfra } from '@src/infrastructures/claudeCode'
import { parseStreamEvents } from '@src/repositories/parsers/claudeCodeParser'
import type { IClaudeCodeRepository } from '@src/repositories/ports/agent'
import type { ClaudeAction, RawOutput } from '@src/types/claudeCode'
import type { AgentStreamEvent } from '@src/types/agent'
import { MCP_SERVER_NAME } from '@src/constants/config'

const PERMISSION_TOOL_NAME = `mcp__${MCP_SERVER_NAME}__ask_permission`

type RawContentBlock = {
  type: string
  thinking?: string
  name?: string
  id?: string
  input?: unknown
  tool_use_id?: string
  content?: unknown
}

type RawStreamEvent = {
  type: string
  message?: { content: RawContentBlock[] }
}

export class ClaudeCodeRepository implements IClaudeCodeRepository {
  private infra = new ClaudeCodeInfra()

  async dispatch(
    action: ClaudeAction,
    onStreamEvent?: (event: AgentStreamEvent) => void
  ): Promise<RawOutput> {
    const args = this.infra.buildArgs(action)

    const baselineSessionId =
      action.type === 'fork' ? action.originalClaudeSessionId : action.sessionId
    const baselineWorkingDir =
      action.type === 'fork' ? action.originalWorkingDir : action.workingDir
    const jsonlBaseline = this.infra.countJsonlLines(
      this.infra.resolveJsonlPath(baselineSessionId, baselineWorkingDir)
    )

    const lines: string[] = []
    const toolNameMap = new Map<string, string>()

    for await (const line of this.infra.runClaude(
      args,
      action.prompt,
      action.workingDir,
      action.sessionFilePath
    )) {
      lines.push(line)
      if (onStreamEvent) emitStreamEvents(line, toolNameMap, onStreamEvent)
    }

    return parseStreamEvents(lines, jsonlBaseline)
  }
}

function emitStreamEvents(
  line: string,
  toolNameMap: Map<string, string>,
  onStreamEvent: (event: AgentStreamEvent) => void
): void {
  const trimmed = line.trim()
  if (!trimmed) return
  let raw: RawStreamEvent
  try {
    raw = JSON.parse(trimmed) as RawStreamEvent
  } catch {
    return
  }
  if (!raw.message?.content) return

  if (raw.type === 'assistant') {
    for (const block of raw.message.content) {
      if (block.type === 'thinking' && block.thinking !== undefined) {
        onStreamEvent({ type: 'thought', thinking: block.thinking })
      } else if (block.type === 'tool_use' && block.name && block.name !== PERMISSION_TOOL_NAME) {
        if (block.id) toolNameMap.set(block.id, block.name)
        onStreamEvent({ type: 'tool_use', name: block.name, input: block.input ?? {} })
      }
    }
  } else if (raw.type === 'user') {
    for (const block of raw.message.content) {
      if (block.type === 'tool_result' && block.tool_use_id) {
        const toolName = toolNameMap.get(block.tool_use_id) ?? '?'
        if (toolName === '?') return
        const result =
          typeof block.content === 'string' ? block.content : JSON.stringify(block.content, null, 2)
        onStreamEvent({ type: 'tool_result', toolName, result })
      }
    }
  }
}
