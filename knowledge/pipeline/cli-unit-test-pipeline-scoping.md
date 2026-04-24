# CLI Layer Unit-Test Pipeline Scoping

**Type:** Discovery

## Context

When creating unit-test pipelines for the CLI layer, certain file types require different testing approaches. Understanding what is included vs. excluded from the standard CLI test pipeline helps avoid wasted effort on incompatible tooling.

## What happened / What is true

Two scoping decisions were made for the CLI unit-test pipelines:

1. **React hooks and TSX components excluded**
   - `usePermission.ts`, `usePipelineRun.ts` — React hooks that require React Testing Library (different from vitest unit tests)
   - `*.tsx` files (PipelineRunner, TaskRow, etc.) — React components requiring component-level rendering tests
   - Included: 18 commands + `display.ts` + `PipelineRunner/utils.ts` (pure `.ts` files only)

2. **4-segment namespace for commands sub-directory**
   - `src/cli/commands/analyze.ts` → `unit-test__cli__commands__analyze.json`
   - The `commands/` sub-directory becomes its own namespace segment
   - Valid per naming convention; depth is not capped at 3 segments

## Do

- Create unit-test pipelines only for pure `.ts` files in the CLI layer
- Use 4-segment namespaces (`unit-test__cli__commands__<name>`) when targeting files under `src/cli/commands/`
- Reference existing CLI pipelines (`unit-test__cli__analyze.json`) as templates

## Don't

- Expect the `test-unit/implement` procedure to handle React hooks or `.tsx` files directly
- Create unit-test pipelines for React components without React Testing Library setup
- Assume the default test runner configuration works for TSX files

---

**Keywords:** pipeline, scoping, cli-layer, React, testing-strategy
