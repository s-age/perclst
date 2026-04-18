#!/usr/bin/env node

/**
 * perclst MCP server — uses @modelcontextprotocol/sdk over stdio
 *
 * Tools:
 *   ask_permission     — permission-prompt-tool for claude -p sessions
 *   ts_analyze         — TypeScript code structure analysis
 *   ts_get_references  — Find references to a TypeScript symbol
 *   ts_get_types       — Get type definitions for a TypeScript symbol
 *   ts_test_strategist — Unit test strategy for a TypeScript file
 *   knowledge_search   — Search the perclst knowledge base
 *   ts_checker         — Run lint/build/test and report results
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { openSync, readSync, writeSync, closeSync } from 'fs'
import { executeTsAnalyze } from './tools/tsAnalyze'
import { executeTsGetReferences } from './tools/tsGetReferences'
import { executeTsGetTypes } from './tools/tsGetTypes'
import { executeTsChecker } from './tools/tsChecker'
import { executeTsTestStrategist } from './tools/tsTestStrategist'
import { executeKnowledgeSearch } from './tools/knowledgeSearch'
import { setupContainer } from '@src/core/di/setup'

setupContainer()

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
    return answer === 'y' || answer === 'yes'
      ? { behavior: 'allow', updatedInput: input }
      : { behavior: 'deny', message: 'User denied permission' }
  } finally {
    closeSync(ttyFd)
  }
}

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const server = new McpServer({ name: 'perclst', version: '1.0.0' })

server.tool(
  'ask_permission',
  'Ask the user whether to allow a tool call. ' +
    'Called by Claude Code when it needs permission to use a built-in tool in headless (-p) mode.',
  {
    tool_name: z.string().describe('The name of the tool requesting permission'),
    input: z.record(z.string(), z.unknown()).describe('The input arguments for the tool'),
    tool_use_id: z.string().optional().describe('The unique tool use request ID')
  },
  async ({ tool_name, input, tool_use_id }) => ({
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(await askPermission({ tool_name, input, tool_use_id }))
      }
    ]
  })
)

server.tool(
  'ts_analyze',
  'Analyze TypeScript code structure (symbols, imports, exports)',
  { file_path: z.string().describe('Path to the TypeScript file to analyze') },
  ({ file_path }) => executeTsAnalyze({ file_path })
)

server.tool(
  'ts_get_references',
  'Find all references to a TypeScript symbol',
  {
    file_path: z.string().describe('Path to the TypeScript file'),
    symbol_name: z.string().describe('Name of the symbol to find references for')
  },
  ({ file_path, symbol_name }) => executeTsGetReferences({ file_path, symbol_name })
)

server.tool(
  'ts_get_types',
  'Get type definitions for a TypeScript symbol',
  {
    file_path: z.string().describe('Path to the TypeScript file'),
    symbol_name: z.string().describe('Name of the symbol to get type information for')
  },
  ({ file_path, symbol_name }) => executeTsGetTypes({ file_path, symbol_name })
)

server.tool(
  'ts_test_strategist',
  'Formulate a unit test strategy for a TypeScript file — identifies untested functions, ' +
    'calculates cyclomatic complexity, and suggests mocks for dependencies.',
  {
    target_file_path: z
      .string()
      .describe('Path to the target TypeScript implementation file (.ts or .tsx)'),
    test_file_path: z
      .string()
      .optional()
      .describe('Path to the corresponding test file (auto-discovered if omitted)')
  },
  ({ target_file_path, test_file_path }) =>
    executeTsTestStrategist({ target_file_path, test_file_path })
)

server.tool(
  'knowledge_search',
  'Search the perclst knowledge base by keyword. ' +
    'Matches against the **Keywords:** field declared in each knowledge file. ' +
    'Space-separated terms are ANDed; use OR between groups for OR logic. ' +
    'Examples: "fork session", "zod OR validation", "fork OR resume session"',
  {
    query: z
      .string()
      .describe(
        'Search query. Supports AND (space or "AND") and OR ("OR") operators. ' +
          'Example: "fork session" → both terms must appear; "zod OR validation" → either term.'
      ),
    include_draft: z
      .boolean()
      .optional()
      .describe('Include knowledge/draft/ files in the search. Defaults to false.')
  },
  ({ query, include_draft }) => executeKnowledgeSearch({ query, include_draft })
)

server.tool(
  'ts_checker',
  'Run lint (lint:fix), build, and unit tests in one shot and report errors/warnings for each. ' +
    'Use this after making TypeScript changes to verify correctness before completing a task.',
  {
    project_root: z
      .string()
      .optional()
      .describe('Absolute path to the project root. Auto-detected when omitted.'),
    lint_command: z.string().optional().describe('Lint command. Defaults to "npm run lint:fix".'),
    build_command: z.string().optional().describe('Build command. Defaults to "npm run build".'),
    test_command: z.string().optional().describe('Test command. Defaults to "npm run test:unit".')
  },
  ({ project_root, lint_command, build_command, test_command }) =>
    executeTsChecker({ project_root, lint_command, build_command, test_command })
)

await server.connect(new StdioServerTransport())
