# MCP Integration Tests with Real Files Must Move Outside src/mcp/

**Type:** Problem

## Context

When an MCP integration test needs real filesystem I/O and must directly instantiate
`KnowledgeSearchRepository`, `KnowledgeReaderInfra`, etc., the test cannot live in
`src/mcp/tools/__tests__/integration/`. The `src/mcp/` layer forbids imports from
`src/repositories/` and `src/infrastructures/`.

## What happened

Writing a `knowledge_search` integration test inside `src/mcp/tools/__tests__/integration/`
required importing `KnowledgeSearchRepository` and `KnowledgeReaderInfra` directly. These imports
violate the architecture rule: `mcp → repositories/*` and `mcp → infrastructures/*` are both
forbidden, even in test files.

Two options existed:
- **Option A**: Stub at service level — stays in `src/mcp/`, but skips real-file I/O
- **Option B**: Relocate to `src/__tests__/integration/` — allows real-file I/O without violation

When the test requirement is "exercise the full stack with real files," Option B is the only valid
choice.

Lazy file reading in repositories means the setup order is safe:
1. Call `setupContainer()` in `beforeEach`
2. Write fixture files in each `it` block
3. Call the tool function — repos read files at call time, not construction time

## Do

- Place real-file MCP integration tests in `src/__tests__/integration/` (layer-neutral)
- Write fixtures to tmpdir in each `it` block; rely on lazy-reading repos

## Don't

- Don't place tests that directly import `repositories/` or `infrastructures/` inside `src/mcp/`
- Don't stub at service level just to avoid relocation when real-file I/O is required

---

**Keywords:** MCP integration test, real filesystem, layer violation, src/__tests__/integration, relocation, knowledge search, lazy read
