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
import { askPermissionParams } from '@src/validators/mcp/askPermission'
import { tsAnalyzeParams } from '@src/validators/mcp/tsAnalyze'
import { tsGetReferencesParams } from '@src/validators/mcp/tsGetReferences'
import { tsGetTypesParams } from '@src/validators/mcp/tsGetTypes'
import { tsTestStrategistParams } from '@src/validators/mcp/tsTestStrategist'
import { knowledgeSearchParams } from '@src/validators/mcp/knowledgeSearch'
import { tsCheckerParams } from '@src/validators/mcp/tsChecker'
import { executeTsAnalyze } from './tools/tsAnalyze'
import { executeTsGetReferences } from './tools/tsGetReferences'
import { executeTsGetTypes } from './tools/tsGetTypes'
import { executeTsChecker } from './tools/tsChecker'
import { executeTsTestStrategist } from './tools/tsTestStrategist'
import { executeKnowledgeSearch } from './tools/knowledgeSearch'
import { executeAskPermission } from './tools/askPermission'
import { setupContainer } from '@src/core/di/setup'

setupContainer()

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const server = new McpServer({ name: 'perclst', version: '1.0.0' })

server.tool(
  'ask_permission',
  'Ask the user whether to allow a tool call. ' +
    'Called by Claude Code when it needs permission to use a built-in tool in headless (-p) mode.',
  askPermissionParams,
  ({ tool_name, input, tool_use_id }) => executeAskPermission({ tool_name, input, tool_use_id })
)

server.tool(
  'ts_analyze',
  'Analyze TypeScript code structure (symbols, imports, exports)',
  tsAnalyzeParams,
  ({ file_path }) => executeTsAnalyze({ file_path })
)

server.tool(
  'ts_get_references',
  'Find all references to a TypeScript symbol',
  tsGetReferencesParams,
  ({ file_path, symbol_name, include_test, recursive }) =>
    executeTsGetReferences({ file_path, symbol_name, include_test, recursive })
)

server.tool(
  'ts_get_types',
  'Get type definitions for a TypeScript symbol',
  tsGetTypesParams,
  ({ file_path, symbol_name }) => executeTsGetTypes({ file_path, symbol_name })
)

server.tool(
  'ts_test_strategist',
  'Formulate a unit test strategy for a TypeScript file — identifies untested functions, ' +
    'calculates cyclomatic complexity, and suggests mocks for dependencies.',
  tsTestStrategistParams,
  ({ target_file_path, test_file_path }) =>
    executeTsTestStrategist({ target_file_path, test_file_path })
)

server.tool(
  'knowledge_search',
  'Search the perclst knowledge base by keyword. ' +
    'Matches against the **Keywords:** field declared in each knowledge file. ' +
    'Space-separated terms are ANDed; use OR between groups for OR logic. ' +
    'Examples: "fork session", "zod OR validation", "fork OR resume session"',
  knowledgeSearchParams,
  ({ query, include_draft }) => executeKnowledgeSearch({ query, include_draft })
)

server.tool(
  'ts_checker',
  'Run lint (lint:fix), build, and unit tests in one shot and report errors/warnings for each. ' +
    'Use this after making TypeScript changes to verify correctness before completing a task.',
  tsCheckerParams,
  ({ project_root, lint_command, build_command, test_command }) =>
    executeTsChecker({ project_root, lint_command, build_command, test_command })
)

await server.connect(new StdioServerTransport())
