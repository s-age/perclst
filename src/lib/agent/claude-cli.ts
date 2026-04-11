import { spawn } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { AgentRequest, AgentResponse, ThinkingBlock, ToolUseRecord } from './types.js'
import { APIError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'

// dist/lib/agent/claude-cli.js → dist/mcp/server.js
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const MCP_SERVER_PATH = resolve(__dirname, '../../mcp/server.js')

function buildMcpConfig(): string {
  return JSON.stringify({
    mcpServers: {
      cloader: {
        command: 'node',
        args: [MCP_SERVER_PATH],
      },
    },
  })
}

// --- stream-json event types ---

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string }

interface StreamEvent {
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

interface ParsedResponse {
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
            record.result = block.content
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
          cache_creation_input_tokens: event.usage.cache_creation_input_tokens,
        }
      }
    }
  }

  return { content: finalContent, thoughts, tool_history: Array.from(toolMap.values()), usage }
}

function runClaude(args: string[], prompt: string): Promise<ParsedResponse> {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', args, {
      env: { ...process.env },
      // Do NOT use 'pipe' for stderr — let it flow to the user's terminal so
      // permission prompts (written to /dev/tty inside the MCP server) are
      // visible even while we capture stdout.
      stdio: ['pipe', 'pipe', 'inherit'],
    })

    let stdout = ''
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })

    child.on('error', (err) => reject(new APIError(`Failed to spawn claude: ${err.message}`)))
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new APIError(`claude exited with code ${code}`))
      } else {
        resolve(parseStreamJson(stdout))
      }
    })

    // Write prompt to stdin and close it
    child.stdin.write(prompt, 'utf-8')
    child.stdin.end()
  })
}

export class ClaudeCLI {
  async call(request: AgentRequest): Promise<AgentResponse> {
    // Build prompt from conversation history
    let fullPrompt = ''

    if (request.system) {
      fullPrompt += `System: ${request.system}\n\n`
    }

    for (const msg of request.messages) {
      fullPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n\n`
    }

    logger.debug('Calling claude CLI', { prompt_length: fullPrompt.length })

    // Base args for -p (print / headless) mode with stream-json output.
    // --verbose is required when combining --print and --output-format=stream-json.
    const args: string[] = ['-p', '--output-format', 'stream-json', '--verbose']

    if (request.config.model) {
      args.push('--model', request.config.model)
    }

    // Explicitly allowed tools (passed as --allowedTools to claude)
    if (request.config.allowedTools?.length) {
      args.push('--allowedTools', ...request.config.allowedTools)
    }

    // Always attach the cloader permission MCP server so the user is prompted
    // before any tool use that isn't pre-approved via --allowedTools.
    // In non-interactive environments (no /dev/tty) the server auto-denies.
    const mcpConfigPath = join(tmpdir(), `cloader-mcp-${process.pid}.json`)
    writeFileSync(mcpConfigPath, buildMcpConfig(), 'utf-8')
    args.push('--mcp-config', mcpConfigPath)
    // Claude Code prefixes MCP tool names as mcp__<server>__<tool>
    args.push('--permission-prompt-tool', 'mcp__cloader__ask_permission')

    logger.debug('Executing claude command', { model: request.config.model, args })

    try {
      const parsed = await runClaude(args, fullPrompt)

      if (!parsed.content) {
        throw new APIError('Empty response from Claude CLI')
      }

      logger.info('Claude CLI response received', {
        response_length: parsed.content.length,
        thoughts_count: parsed.thoughts.length,
        tool_calls_count: parsed.tool_history.length,
      })

      return {
        content: parsed.content,
        model: 'claude-cli',
        usage: parsed.usage,
        thoughts: parsed.thoughts.length > 0 ? parsed.thoughts : undefined,
        tool_history: parsed.tool_history.length > 0 ? parsed.tool_history : undefined,
      }
    } finally {
      try { unlinkSync(mcpConfigPath) } catch { /* ignore */ }
    }
  }
}
