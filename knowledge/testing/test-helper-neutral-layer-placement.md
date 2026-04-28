# Shared Test Helpers Must Live in src/__tests__/, Not a Layer Directory

**Type:** Discovery

## Context

Shared test utilities like `makeTmpDir` and `buildTestConfig` are used by both CLI and MCP tests.
Placing them inside a layer-specific test directory causes architecture violations when another
layer tries to import them.

## What is true

The architecture rule `mcp → cli/*` is forbidden — even in test code. Placing a shared helper in
`src/cli/commands/__tests__/integration/helpers.ts` breaks any MCP test that tries to import it.

Shared helpers must live in `src/__tests__/` (layer-neutral).

**Migration pattern when a helper is already in a layer-specific location:**
1. Move the helper to `src/__tests__/helpers.ts`
2. Have the original location re-export from `src/__tests__/helpers`
3. All layers import from `src/__tests__/helpers`
4. Existing CLI tests using relative imports (`'./helpers'`) remain unaffected via the re-export

This pattern lets CLI tests keep their short relative import path while allowing MCP and other
layers to import the same helper without violation.

## Do

- Create shared test helpers in `src/__tests__/` (layer-neutral)
- Re-export from the original layer-specific location to preserve existing relative imports

## Don't

- Don't place shared helpers in `src/cli/` or any other layer-specific directory
- Don't import test helpers across layer boundaries (e.g., MCP importing from `src/cli/...`)

---

**Keywords:** test helper, shared utility, layer violation, src/__tests__, makeTmpDir, buildTestConfig, cross-layer import, re-export
