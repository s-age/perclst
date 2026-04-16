#!/usr/bin/env node

/**
 * perclst MCP server — JSON-RPC 2.0 over stdio
 *
 * Tools:
 *   ask_permission     — permission-prompt-tool for claude -p sessions
 *   ts_analyze         — TypeScript code structure analysis
 *   ts_get_references  — Find references to a TypeScript symbol
 *   ts_get_types       — Get type definitions for a TypeScript symbol
 *   ts_checker         — Run lint/build/test and report results
 */

import { openSync, readSync, writeSync, closeSync } from 'fs'
import { executeTsAnalyze } from './tools/tsAnalyze'
import { executeTsGetReferences } from './tools/tsGetReferences'
import { executeTsGetTypes } from './tools/tsGetTypes'
import { executeTsChecker } from './tools/tsChecker'
import { executeTsTestStrategist } from './tools/tsTestStrategist'
import { executeKnowledgeSearch } from './tools/knowledgeSearch'
import { setupContainer } from '@src/core/di/setup'
import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import { TypeScriptProject } from './analyzers/project'

setupContainer()
container.register(TOKENS.TypeScriptProject, new TypeScriptProject())

// ---------------------------------------------------------------------------
// JSON-RPC 2.0 types
// ---------------------------------------------------------------------------

type JSONRPCRequest = {
  jsonrpc: '2.0'
  id?: number | string | null
  method: string
  params?: unknown
}

type JSONRPCResponse = {
  jsonrpc: '2.0'
  id: number | string | null
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: 'ask_permission',
    description:
      'Ask the user whether to allow a tool call. ' +
      'Called by Claude Code when it needs permission to use a built-in tool in headless (-p) mode.',
    inputSchema: {
      type: 'object',
      properties: {
        tool_name: { type: 'string', description: 'The name of the tool requesting permission' },
        input: { type: 'object', description: 'The input arguments for the tool' },
        tool_use_id: { type: 'string', description: 'The unique tool use request ID' }
      },
      required: ['tool_name', 'input']
    }
  },
  {
    name: 'ts_analyze',
    description: 'Analyze TypeScript code structure (symbols, imports, exports)',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Path to the TypeScript file to analyze' }
      },
      required: ['file_path']
    }
  },
  {
    name: 'ts_get_references',
    description: 'Find all references to a TypeScript symbol',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Path to the TypeScript file' },
        symbol_name: { type: 'string', description: 'Name of the symbol to find references for' }
      },
      required: ['file_path', 'symbol_name']
    }
  },
  {
    name: 'ts_get_types',
    description: 'Get type definitions for a TypeScript symbol',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Path to the TypeScript file' },
        symbol_name: {
          type: 'string',
          description: 'Name of the symbol to get type information for'
        }
      },
      required: ['file_path', 'symbol_name']
    }
  },
  {
    name: 'ts_test_strategist',
    description:
      'Formulate a unit test strategy for a TypeScript file — identifies untested functions, ' +
      'calculates cyclomatic complexity, and suggests mocks for dependencies.',
    inputSchema: {
      type: 'object',
      properties: {
        target_file_path: {
          type: 'string',
          description: 'Path to the target TypeScript implementation file (.ts or .tsx)'
        },
        test_file_path: {
          type: 'string',
          description: 'Path to the corresponding test file (auto-discovered if omitted)'
        }
      },
      required: ['target_file_path']
    }
  },
  {
    name: 'knowledge_search',
    description:
      'Search the perclst knowledge base by keyword. ' +
      'Matches against the **Keywords:** field declared in each knowledge file. ' +
      'Space-separated terms are ANDed; use OR between groups for OR logic. ' +
      'Examples: "fork session", "zod OR validation", "fork OR resume session"',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Search query. Supports AND (space or "AND") and OR ("OR") operators. ' +
            'Example: "fork session" → both terms must appear; "zod OR validation" → either term.'
        },
        include_draft: {
          type: 'boolean',
          description: 'Include knowledge/draft/ files in the search. Defaults to false.'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'ts_checker',
    description:
      'Run lint (lint:fix), build, and unit tests in one shot and report errors/warnings for each. ' +
      'Use this after making TypeScript changes to verify correctness before completing a task.',
    inputSchema: {
      type: 'object',
      properties: {
        project_root: {
          type: 'string',
          description: 'Absolute path to the project root. Auto-detected when omitted.'
        },
        lint_command: {
          type: 'string',
          description: 'Lint command. Defaults to "npm run lint:fix".'
        },
        build_command: {
          type: 'string',
          description: 'Build command. Defaults to "npm run build".'
        },
        test_command: {
          type: 'string',
          description: 'Test command. Defaults to "npm run test:unit".'
        }
      },
      required: []
    }
  }
]

// ---------------------------------------------------------------------------
// ask_permission: interactive prompt via /dev/tty
// ---------------------------------------------------------------------------

function formatInputSummary(input: Record<string, unknown>): string {
  const primary = input.command ?? input.file_path ?? input.path ?? input.url ?? input.pattern
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
    `\nPermission Request\n` +
    `  Tool : ${tool_name}\n` +
    `  Input: ${summary.replace(/\n/g, '\n         ')}\n` +
    `  Allow? [y/N] `

  let ttyFd: number
  try {
    ttyFd = openSync('/dev/tty', 'r+')
  } catch {
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

function err(id: number | string | null, code: number, message: string): JSONRPCResponse {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

// ---------------------------------------------------------------------------
// Tool call dispatcher
// ---------------------------------------------------------------------------

function wrapTextResult(text: string): { content: { type: string; text: string }[] } {
  return { content: [{ type: 'text', text }] }
}

async function handleToolsCall(id: number | string | null, params: unknown): Promise<void> {
  const p = params as { name: string; arguments: Record<string, unknown> }
  try {
    let result: { content: { type: string; text: string }[] }
    switch (p.name) {
      case 'ask_permission':
        result = wrapTextResult(
          JSON.stringify(
            await askPermission(
              p.arguments as {
                tool_name: string
                input: Record<string, unknown>
                tool_use_id?: string
              }
            )
          )
        )
        break
      case 'ts_analyze':
        result = await executeTsAnalyze(p.arguments as { file_path: string })
        break
      case 'ts_get_references':
        result = await executeTsGetReferences(
          p.arguments as { file_path: string; symbol_name: string }
        )
        break
      case 'ts_get_types':
        result = await executeTsGetTypes(p.arguments as { file_path: string; symbol_name: string })
        break
      case 'ts_test_strategist':
        result = await executeTsTestStrategist(
          p.arguments as { target_file_path: string; test_file_path?: string }
        )
        break
      case 'knowledge_search':
        result = await executeKnowledgeSearch(
          p.arguments as { query: string; include_draft?: boolean }
        )
        break
      case 'ts_checker':
        result = await executeTsChecker(
          p.arguments as {
            project_root?: string
            lint_command?: string
            build_command?: string
            test_command?: string
          }
        )
        break
      default:
        send(err(id, -32601, `Unknown tool: ${p.name}`))
        return
    }
    send({ jsonrpc: '2.0', id, result })
  } catch (e) {
    send(err(id, -32603, `Tool execution failed: ${e instanceof Error ? e.message : String(e)}`))
  }
}

// ---------------------------------------------------------------------------
// Request dispatcher
// ---------------------------------------------------------------------------

async function handleRequest(req: JSONRPCRequest): Promise<void> {
  const id = req.id ?? null

  // Notifications have no id and need no response
  if (req.id === undefined && req.method.startsWith('notifications/')) return

  switch (req.method) {
    case 'initialize':
      send({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'perclst', version: '1.0.0' }
        }
      })
      break

    case 'tools/list':
      send({ jsonrpc: '2.0', id, result: { tools: TOOLS } })
      break

    case 'tools/call':
      await handleToolsCall(id, req.params)
      break

    default:
      if (req.id !== undefined) send(err(id, -32601, `Method not found: ${req.method}`))
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
        await handleRequest(JSON.parse(line) as JSONRPCRequest)
      } catch (e) {
        send(err(null, -32700, `Parse error: ${e instanceof Error ? e.message : String(e)}`))
      }
    }
  })

  process.stdin.on('end', () => process.exit(0))
}

main()
