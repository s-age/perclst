# Vitest ESM: Direct Mutation of Mocked Module Exports Silently Breaks

**Type:** Problem

## Context

Applies when writing tests in a project configured with `"type": "module"` (strict ESM). Relevant
any time a test mocks a module and then attempts to replace an exported binding by direct
assignment (e.g., `(container.resolve as any) = mockFn`).

## What happened / What is true

- In strict ESM, module bindings are **live and read-only**. Direct assignment bypasses Vitest's
  module-mock machinery entirely.
- The mock may appear to work locally but silently fails or leaks state between tests, especially
  under parallel runs or after `vi.clearAllMocks()`.
- The correct pattern — `vi.mock()` at module level + `vi.mocked()` in `beforeEach` — is already
  used across all other MCP tool tests (`knowledgeSearch`, `tsAnalyze`, etc.).

## Do

- Declare the mock at the top of the test file: `vi.mock('@src/core/di/container')`
- In `beforeEach`, configure return values via `vi.mocked()`:
  ```ts
  vi.mocked(container.resolve).mockReturnValue(mockService as unknown as MyService)
  ```
- Assert calls via `expect(container.resolve).toHaveBeenCalledWith(TOKENS.MyService)`

## Don't

- Never assign directly to a mocked module export:
  ```ts
  // WRONG — silently broken in strict ESM
  (container.resolve as any) = mockResolve
  ```
- Don't rely on direct assignment even if it "passes" in isolation — it will fail under parallel
  runs or after mock-clear lifecycle hooks.

---

**Keywords:** vitest, ESM, module mock, vi.mock, vi.mocked, container, direct assignment, live bindings, strict ESM, test isolation
