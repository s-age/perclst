import { spawn } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { ThinkingBlock, ToolUseRecord } from '@src/types/common'
import type { ClaudeAction, RawOutput, IClaudeCodeRepository } from '@src/types/claudeCode'
import { APIError } from '@src/errors/apiError'
import { RateLimitError } from '@src/errors/rateLimitError'
import { APP_NAME, MCP_SERVER_NAME } from '@src/constants/config'

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

function parseStreamJson(raw: string): RawOutput {
  const thoughts: ThinkingBlock[] = []
  const toolMap = new Map<string, ToolUseRecord>()
  let finalContent = ''
  let usage: RawOutput['usage'] = { input_tokens: 0, output_tokens: 0 }

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
): Promise<RawOutput> {
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
        if (
          combined.toLowerCase().includes("you've hit your limit") ||
          combined.toLowerCase().includes('you have hit your limit')
        ) {
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

async function dispatch(action: ClaudeAction): Promise<RawOutput> {
  const args: string[] = ['-p', '--output-format', 'stream-json', '--verbose']

  if (action.model) {
    args.push('--model', action.model)
  }

  if (action.type === 'resume') {
    args.push('--resume', action.sessionId)
  } else {
    args.push('--session-id', action.sessionId)
    if (action.system) {
      args.push('--system-prompt', action.system)
    }
  }

  if (action.allowedTools?.length) {
    args.push('--allowedTools', ...action.allowedTools)
  }

  const mcpConfigPath = join(tmpdir(), `${APP_NAME}-mcp-${process.pid}.json`)
  writeFileSync(mcpConfigPath, buildMcpConfig(), 'utf-8')
  args.push('--mcp-config', mcpConfigPath)
  args.push('--permission-prompt-tool', `mcp__${MCP_SERVER_NAME}__ask_permission`)

  try {
    return await runClaude(args, action.prompt, action.workingDir, action.sessionFilePath)
  } finally {
    try {
      unlinkSync(mcpConfigPath)
    } catch {
      /* ignore */
    }
  }
}

export class ClaudeCodeRepository implements IClaudeCodeRepository {
  async dispatch(action: ClaudeAction): Promise<RawOutput> {
    return dispatch(action)
  }
}
