# TUI Code Path Is Unreachable in Integration Tests

**Type:** Problem

## Context

`src/cli/commands/run.ts` has TUI-specific branches gated on `process.stdout.isTTY && !input.batch`. In integration test environments `isTTY` is always false, so these branches are never entered regardless of test input.

## What happened / What is true

- Lines 98-104 (catch block for `loadPipelineOrExit`, TUI path) and lines 147-184 (`executeTUIPipeline` function) in `run.ts` are unreachable in integration tests
- `executeTUIPipeline` uses dynamic imports for `ink`, `react`, and `PipelineRunner.js`; reaching it would require module-level `vi.mock()` for all three plus a mock `render()` that calls `onDone`
- Patching `isTTY` via `Object.defineProperty` alone is insufficient because of the dynamic import chain

## Do

- Exclude TUI branches from integration test coverage thresholds
- Cover TUI rendering correctness via `PipelineRunner` component tests or E2E tests
- Mark TUI-only blocks with `/* c8 ignore next */` when fine-grained per-line exclusion is needed

## Don't

- Don't attempt to reach TUI paths from integration tests by patching `isTTY` alone — the dynamic import chain makes it impractical without heavy mocking
- Don't include TUI branches in line/branch coverage thresholds enforced in integration test suites

---

**Keywords:** TUI, isTTY, integration test, coverage exclusion, executeTUIPipeline, run.ts, dynamic import, ink, c8 ignore
