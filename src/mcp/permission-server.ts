#!/usr/bin/env node

/**
 * cloader permission MCP server
 *
 * Implements the MCP JSON-RPC 2.0 protocol over stdio and exposes a single
 * `ask_permission` tool that Claude Code calls via --permission-prompt-tool.
 *
 * When Claude Code needs approval for a tool call in -p (print) mode, it
 * invokes ask_permission with the tool name and input.  This server prompts
 * the user interactively via /dev/tty (bypassing the MCP stdio pipes) and
 * returns an allow or deny decision.
 */

import { openSync, readSync, writeSync, closeSync } from 'fs'

// ---------------------------------------------------------------------------
// JSON-RPC 2.0 types
// ---------------------------------------------------------------------------

interface JSONRPCRequest {
  jsonrpc: '2.0'
  id?: number | string | null
  method: string
  params?: unknown
}

interface JSONRPCResponse {
  jsonrpc: '2.0'
  id: number | string | null
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

const ASK_PERMISSION_TOOL = {
  name: 'ask_permission',
  description:
    'Ask the user whether to allow a tool call. ' +
    'Called by Claude Code when it needs permission to use a built-in tool in headless (-p) mode.',
  inputSchema: {
    type: 'object',
    properties: {
      tool_name: {
        type: 'string',
        description: 'The name of the tool requesting permission',
      },
      input: {
        type: 'object',
        description: 'The input arguments for the tool',
      },
      tool_use_id: {
        type: 'string',
        description: 'The unique tool use request ID',
      },
    },
    required: ['tool_name', 'input'],
  },
}

// ---------------------------------------------------------------------------
// Interactive prompt via /dev/tty
// ---------------------------------------------------------------------------

function formatInputSummary(input: Record<string, unknown>): string {
  // Show the most relevant field first, fall back to compact JSON
  const primary =
    input.command ??
    input.file_path ??
    input.path ??
    input.url ??
    input.pattern
  if (primary !== undefined) return String(primary)
  const json = JSON.stringify(input, null, 2)
  const lines = json.split('\n')
  return lines.length > 6 ? lines.slice(0, 6).join('\n') + '\n  ...' : json
}

type PermissionResult =
  | { behavior: 'allow'; updatedInput: Record<string, unknown> }
  | { behavior: 'deny'; message: string }

async function askPermission(args: {
  tool_name: string
  input: Record<string, unknown>
  tool_use_id?: string
}): Promise<PermissionResult> {
  const { tool_name, input } = args
  const summary = formatInputSummary(input)

  const prompt =
    `\n` +
    `Permission Request\n` +
    `  Tool : ${tool_name}\n` +
    `  Input: ${summary.replace(/\n/g, '\n         ')}\n` +
    `  Allow? [y/N] `

  // /dev/tty gives us direct terminal access even when stdin/stdout are piped
  let ttyFd: number
  try {
    ttyFd = openSync('/dev/tty', 'r+')
  } catch {
    // No controlling terminal (e.g. CI) — deny by default
    return { behavior: 'deny', message: 'No terminal available for interactive prompt' }
  }

  try {
    writeSync(ttyFd, prompt)

    const buf = Buffer.alloc(256)
    const bytesRead = readSync(ttyFd, buf, 0, 256, null)
    const answer = buf.slice(0, bytesRead).toString().trim().toLowerCase()

    if (answer === 'y' || answer === 'yes') {
      return { behavior: 'allow', updatedInput: input }
    }
    return { behavior: 'deny', message: 'User denied permission' }
  } finally {
    closeSync(ttyFd)
  }
}

// ---------------------------------------------------------------------------
// JSON-RPC helpers
// ---------------------------------------------------------------------------

function send(response: JSONRPCResponse): void {
  process.stdout.write(JSON.stringify(response) + '\n')
}

function errorResponse(
  id: number | string | null,
  code: number,
  message: string,
): JSONRPCResponse {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

// ---------------------------------------------------------------------------
// Request dispatcher
// ---------------------------------------------------------------------------

async function handleRequest(req: JSONRPCRequest): Promise<void> {
  const id = req.id ?? null

  // Notifications (no id) — no response needed
  if (req.id === undefined && req.method.startsWith('notifications/')) {
    return
  }

  switch (req.method) {
    case 'initialize':
      send({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'cloader-permission', version: '1.0.0' },
        },
      })
      break

    case 'tools/list':
      send({
        jsonrpc: '2.0',
        id,
        result: { tools: [ASK_PERMISSION_TOOL] },
      })
      break

    case 'tools/call': {
      const p = req.params as { name: string; arguments: Record<string, unknown> }

      if (p.name !== 'ask_permission') {
        send(errorResponse(id, -32601, `Unknown tool: ${p.name}`))
        break
      }

      try {
        const result = await askPermission(
          p.arguments as {
            tool_name: string
            input: Record<string, unknown>
            tool_use_id?: string
          },
        )
        send({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result) }],
          },
        })
      } catch (err) {
        send(
          errorResponse(
            id,
            -32603,
            `Permission prompt failed: ${err instanceof Error ? err.message : String(err)}`,
          ),
        )
      }
      break
    }

    default:
      if (req.id !== undefined) {
        send(errorResponse(id, -32601, `Method not found: ${req.method}`))
      }
  }
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  process.stdin.setEncoding('utf-8')
  let buffer = ''

  process.stdin.on('data', async (chunk: string) => {
    buffer += chunk

    let idx: number
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trim()
      buffer = buffer.slice(idx + 1)

      if (!line) continue

      try {
        const req: JSONRPCRequest = JSON.parse(line)
        await handleRequest(req)
      } catch (err) {
        send(
          errorResponse(
            null,
            -32700,
            `Parse error: ${err instanceof Error ? err.message : String(err)}`,
          ),
        )
      }
    }
  })

  process.stdin.on('end', () => process.exit(0))
}

main()
