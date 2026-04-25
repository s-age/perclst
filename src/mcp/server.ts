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
import { gitPendingChangesParams } from '@src/validators/mcp/gitPendingChanges'
import { executeTsAnalyze } from './tools/tsAnalyze'
import { executeTsGetReferences } from './tools/tsGetReferences'
import { executeTsGetTypes } from './tools/tsGetTypes'
import { executeTsChecker } from './tools/tsChecker'
import { executeTsTestStrategist } from './tools/tsTestStrategist'
import { executeKnowledgeSearch } from './tools/knowledgeSearch'
import { executeAskPermission } from './tools/askPermission'
import { executeGitPendingChanges } from './tools/gitPendingChanges'
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
  'Returns all symbols (functions, variables, types), imports, and exports of a TypeScript file. ' +
    'When: first step before writing tests, editing, or reviewing any file in src/ — before reading line by line. ' +
    'Why: gives a complete surface map without reading the full source. ' +
    'How: use the symbol list to identify what to test or where to make changes; feed key symbols into ts_get_types for exact signatures.',
  tsAnalyzeParams,
  ({ file_path }) => executeTsAnalyze({ file_path })
)

server.tool(
  'ts_get_references',
  'Finds all call sites of a named TypeScript symbol across the codebase. ' +
    'When: before refactoring or renaming any symbol. ' +
    'Why: reveals blast radius — how many callers exist and where they are. ' +
    'How: review every call site before making changes so you know what else needs to be updated.',
  tsGetReferencesParams,
  ({ file_path, symbol_name, include_test, recursive }) =>
    executeTsGetReferences({ file_path, symbol_name, include_test, recursive })
)

server.tool(
  'ts_get_types',
  'Returns parameter types and return type for a named TypeScript symbol. ' +
    'When: when you need the exact signature of a function before calling or testing it. ' +
    'Why: avoids guessing types or reading the full source manually. ' +
    'How: use the returned signature to write correct function calls or test stubs.',
  tsGetTypesParams,
  ({ file_path, symbol_name }) => executeTsGetTypes({ file_path, symbol_name })
)

server.tool(
  'ts_test_strategist',
  'Identifies untested functions, calculates cyclomatic complexity, and suggests mocks for a TypeScript file. ' +
    'When: starting point for any unit test task. ' +
    'Why: tells you what to test, how many cases to write, and what to mock — without reading source first. ' +
    'How: follow with ts_analyze to read the target file, write the tests, then verify with ts_checker.',
  tsTestStrategistParams,
  ({ target_file_path, test_file_path }) =>
    executeTsTestStrategist({ target_file_path, test_file_path })
)

server.tool(
  'knowledge_search',
  'Searches the perclst knowledge base by keyword. ' +
    'Matches against the Keywords field in each knowledge file. ' +
    'Space-separated terms are ANDed; use OR between groups for OR logic. ' +
    'Examples: "fork session", "zod OR validation", "fork OR resume session". ' +
    'When: before starting any non-trivial task. ' +
    'Why: a past problem, gotcha, or design decision may already be documented — avoids rediscovering known issues. ' +
    'How: search with relevant keywords; read matching entries before proceeding.',
  knowledgeSearchParams,
  ({ query, include_draft }) => executeKnowledgeSearch({ query, include_draft })
)

server.tool(
  'ts_checker',
  'Runs lint (lint:fix), build, and unit tests in one shot and reports errors/warnings for each phase. ' +
    'When: after every TypeScript change before reporting a task complete. ' +
    'Do NOT run eslint, tsc, npm run build, or vitest directly in the shell — use this tool instead. ' +
    'Why: catches lint errors, type errors, and test failures in one call without consuming shell history. ' +
    'How: if ok is false, inspect the errors/warnings fields and fix before completing.',
  tsCheckerParams,
  ({ project_root, lint_command, build_command, test_command }) =>
    executeTsChecker({ project_root, lint_command, build_command, test_command })
)

server.tool(
  'git_pending_changes',
  'Returns a unified diff of all uncommitted changes — staged, unstaged, and new untracked files. ' +
    'When: at the start of any review, audit, or pre-commit inspection task. ' +
    'Why: a single call replaces git diff + git diff --cached + git ls-files + per-file reads, reducing multiple tool call turns to one. ' +
    'How: read the returned diff to understand what has changed; feed specific file paths into ts_analyze or Read for deeper inspection.',
  gitPendingChangesParams,
  ({ repo_path, extensions }) => executeGitPendingChanges({ repo_path, extensions })
)

await server.connect(new StdioServerTransport())
