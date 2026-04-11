import { spawn } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { AgentRequest, AgentResponse } from './types.js'
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

function runClaude(args: string[], prompt: string): Promise<string> {
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
        resolve(stdout.trim())
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

    // Base args for -p (print / headless) mode
    const args: string[] = ['-p']

    if (request.config.model) {
      args.push('--model', request.config.model)
    }

    // Explicitly allowed tools (passed as --allowedTools to claude)
    if (request.config.allowedTools?.length) {
      args.push('--allowedTools', ...request.config.allowedTools)
    }

    // Attach the cloader permission MCP server when requested
    let mcpConfigPath: string | undefined
    if (request.config.interactivePermissions) {
      mcpConfigPath = join(tmpdir(), `cloader-mcp-${process.pid}.json`)
      writeFileSync(mcpConfigPath, buildMcpConfig(), 'utf-8')
      args.push('--mcp-config', mcpConfigPath)
      // Claude Code prefixes MCP tool names as mcp__<server>__<tool>
      args.push('--permission-prompt-tool', 'mcp__cloader__ask_permission')
      logger.debug('Interactive permissions enabled', { mcpConfigPath })
    }

    logger.debug('Executing claude command', { model: request.config.model, args })

    try {
      const content = await runClaude(args, fullPrompt)

      if (!content) {
        throw new APIError('Empty response from Claude CLI')
      }

      logger.info('Claude CLI response received', { response_length: content.length })

      return {
        content,
        model: 'claude-cli',
        usage: { input_tokens: 0, output_tokens: 0 },
      }
    } finally {
      // Clean up temp file
      if (mcpConfigPath) {
        try { unlinkSync(mcpConfigPath) } catch { /* ignore */ }
      }
    }
  }
}
