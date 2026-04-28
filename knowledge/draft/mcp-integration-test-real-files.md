# MCP Integration Tests with Real Files Must Relocate Outside src/mcp/

## Problem

When an MCP integration test requires real filesystem I/O (not mocks), it must instantiate `KnowledgeSearchRepository`, `KnowledgeReaderInfra`, etc. directly to exercise the full stack. However, `src/mcp/` layer forbids imports from `src/repositories/` and `src/infrastructures/`.

Two options existed:
- **Option A**: Stub at service level (stays in mcp/, but violates real-file requirement)
- **Option B**: Relocate test to layer-neutral location (allows real-file I/O without violation)

## Solution

Real-file MCP integration tests belong in `src/__tests__/integration/` (or any path outside `src/mcp/`), not in `src/mcp/tools/__tests__/integration/`.

This allows:
1. Full stack execution (tool → service → domain → repo → infra → real filesystem)
2. Repo and infra imports without layer violation
3. tmpdir-based file setup in test

**File location**: `src/__tests__/integration/knowledgeSearch.integration.test.ts`

## Pattern

Lazy file reading in repositories (files read at `search()` time, not construction time) means:
1. Call `setupContainer()` in `beforeEach`
2. Write test files in each `it` block
3. Call tool function
4. Assert results

Repositories will read files correctly even though they were written after DI setup.

## Keywords

MCP integration test, real filesystem, layer violation, relocation, src/__tests__/
