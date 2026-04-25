# ts_checker: Separate typecheck Step for tsc --noEmit

**Type:** Discovery

## Context

Applies when working with the `ts_checker` MCP tool in this project. The tool runs a multi-step pipeline (lint → build → test → typecheck) and the purpose of each step is distinct.

## What happened / What is true

`ts_checker` originally ran three steps: lint (eslint), build (tsup), and test (vitest). All three use esbuild-based transpilation under the hood, which strips types without checking them. As a result, TypeScript type errors visible in VSCode's Language Server passed through `ts_checker` undetected.

A concrete example: the Vitest v1 two-argument form `vi.fn<[T], void>()` raises `TS2558` in VSCode but was silently accepted by `ts_checker` until a dedicated typecheck step was added.

A **fourth step — `typecheck (tsc --noEmit)`** — was added rather than replacing `build`:

- `build (tsup)` — verifies that `dist/` artifacts are produced correctly
- `typecheck (tsc --noEmit)` — verifies type correctness; produces no output files

Implementation touch-points:
- `package.json`: `"typecheck": "tsc --noEmit"` script
- `CheckerOptions`, `CheckerResult`, `ICheckerRepository`, `CheckerDomain`, `CheckerRepository` — all extended with `typecheck`
- `ts_checker` MCP tool description and `inputSchema` updated

## Do

- Expect `ts_checker` to run four steps: lint, build, test, typecheck
- Use `ts_checker` as the single verification command after any `src/` change (replaces running eslint/tsc/vitest separately)

## Don't

- Assume the `build` step catches type errors — tsup/esbuild do not type-check
- Run `tsc`, `eslint`, or `vitest` directly in the shell; use `ts_checker` instead

---

**Keywords:** ts_checker, tsc, noEmit, typecheck, esbuild, tsup, type errors, build step, MCP tool, pipeline
