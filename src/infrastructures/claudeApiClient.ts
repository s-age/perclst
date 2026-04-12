import { spawn } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { AgentRequest, AgentResponse } from '@src/types/agent'
import type { ThinkingBlock, ToolUseRecord } from '@src/types/common'
import { APIError, RateLimitError } from '@src/utils/errors'
import { logger } from '@src/utils/logger'
import { APP_NAME, MCP_SERVER_NAME } from '@src/constants/config'
import type { IAgentClient } from '@src/repositories/agentClient'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const MCP_SERVER_PATH = resolve(__dirname, '../mcp/server.js')

function buildMcpConfig(): string {
  return JSON.stringify({
    mcpServers: {
      [MCP_SERVER_NAME]: {
        command: 'node',
        args: [MCP_SERVER_PATH]
      }
    }
  })
}

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: unknown }

type StreamEvent = {
  type: 'assistant' | 'user' | 'system' | 'result'
  subtype?: string
  parent_tool_use_id?: string
  message?: {
    role: string
    content: ContentBlock[]
    usage?: {
      input_tokens: number
      output_tokens: number
      cache_read_input_tokens?: number
      cache_creation_input_tokens?: number
    }
  }
  result?: string
  usage?: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens?: number
    cache_creation_input_tokens?: number
  }
}

type ParsedResponse = {
  content: string
  thoughts: ThinkingBlock[]
  tool_history: ToolUseRecord[]
  usage: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens?: number
    cache_creation_input_tokens?: number
  }
}

function parseStreamJson(raw: string): ParsedResponse {
  const thoughts: ThinkingBlock[] = []
  const toolMap = new Map<string, ToolUseRecord>()
  let finalContent = ''
  let usage: ParsedResponse['usage'] = { input_tokens: 0, output_tokens: 0 }

  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    let event: StreamEvent
    try {
      event = JSON.parse(trimmed) as StreamEvent
    } catch {
      continue
    }

    if (event.type === 'assistant' && event.message) {
      for (const block of event.message.content) {
        if (block.type === 'thinking') {
          thoughts.push({ type: 'thinking', thinking: block.thinking })
        } else if (block.type === 'tool_use') {
          toolMap.set(block.id, { id: block.id, name: block.name, input: block.input })
        }
      }
    } else if (event.type === 'user' && event.message) {
      for (const block of event.message.content) {
        if (block.type === 'tool_result') {
          const record = toolMap.get(block.tool_use_id)
          if (record) {
            record.result =
              typeof block.content === 'string'
                ? block.content
                : JSON.stringify(block.content, null, 2)
          }
        }
      }
    } else if (event.type === 'result') {
      finalContent = event.result ?? ''
      if (event.usage) {
        usage = {
          input_tokens: event.usage.input_tokens,
          output_tokens: event.usage.output_tokens,
          cache_read_input_tokens: event.usage.cache_read_input_tokens,
          cache_creation_input_tokens: event.usage.cache_creation_input_tokens
        }
      }
    }
  }

  return { content: finalContent, thoughts, tool_history: Array.from(toolMap.values()), usage }
}

function runClaude(
  args: string[],
  prompt: string,
  workingDir: string,
  sessionFilePath?: string
): Promise<ParsedResponse> {
  return new Promise((resolve, reject) => {
    const env: NodeJS.ProcessEnv = { ...process.env }
    if (sessionFilePath) {
      env.PERCLST_SESSION_FILE = sessionFilePath
    }
    const child = spawn('claude', args, {
      env,
      cwd: workingDir,
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    child.on('error', (err) => reject(new APIError(`Failed to spawn claude: ${err.message}`)))
    child.on('close', (code) => {
      if (code !== 0) {
        const combined = stderr + stdout
        const rateLimitMatch = combined.match(/resets?\s+([^\n\r]+)/i)
        if (combined.toLowerCase().includes("you've hit your limit") || combined.toLowerCase().includes("you have hit your limit")) {
          reject(new RateLimitError(rateLimitMatch?.[1]?.trim()))
        } else {
          if (stderr) process.stderr.write(stderr)
          reject(new APIError(`claude exited with code ${code}`))
        }
      } else {
        resolve(parseStreamJson(stdout))
      }
    })

    child.stdin.write(prompt, 'utf-8')
    child.stdin.end()
  })
}

export class ClaudeApiClient implements IAgentClient {
  async call(request: AgentRequest): Promise<AgentResponse> {
    logger.debug('Calling claude CLI', {
      instruction_length: request.instruction.length,
      is_resume: request.isResume,
      session_id: request.claudeSessionId
    })

    const args: string[] = ['-p', '--output-format', 'stream-json', '--verbose']

    if (request.config.model) {
      args.push('--model', request.config.model)
    }

    if (request.isResume) {
      args.push('--resume', request.claudeSessionId)
    } else {
      args.push('--session-id', request.claudeSessionId)
    }

    if (request.config.allowedTools?.length) {
      args.push('--allowedTools', ...request.config.allowedTools)
    }

    const mcpConfigPath = join(tmpdir(), `${APP_NAME}-mcp-${process.pid}.json`)
    writeFileSync(mcpConfigPath, buildMcpConfig(), 'utf-8')
    args.push('--mcp-config', mcpConfigPath)
    args.push('--permission-prompt-tool', `mcp__${MCP_SERVER_NAME}__ask_permission`)

    if (request.system) {
      args.push('--system-prompt', request.system)
    }

    try {
      const parsed = await runClaude(
        args,
        request.instruction,
        request.workingDir,
        request.sessionFilePath
      )

      if (!parsed.content) {
        throw new APIError('Empty response from Claude CLI')
      }

      return {
        content: parsed.content,
        model: 'claude-cli',
        usage: parsed.usage,
        thoughts: parsed.thoughts.length > 0 ? parsed.thoughts : undefined,
        tool_history: parsed.tool_history.length > 0 ? parsed.tool_history : undefined
      }
    } finally {
      try {
        unlinkSync(mcpConfigPath)
      } catch {
        /* ignore */
      }
    }
  }
}
