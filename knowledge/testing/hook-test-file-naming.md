# Test File Naming: Name After the Hook, Not the Utility Module

**Type:** Discovery

## Context

When a React hook (`useScrollBuffer.ts`) wraps a utility module (`scrollBuffer.ts`),
there is a risk that the test file is named after the utility — leaving the hook itself
at 0% coverage.

## What is true

The old test `scrollBuffer.test.ts` only covered the pure functions exported from
`scrollBuffer.ts`. `useScrollBuffer.ts` had no test file and therefore no coverage.

The correct pattern — followed by `usePipelineRun.test.ts` — is to name the test file
after the hook and test both the pure helpers and the hook in the same file:

```
useScrollBuffer.test.ts   ← tests scrollBuffer pure utils + useScrollBuffer hook
usePipelineRun.test.ts    ← tests taskSep/updateAtPath (pure) + usePipelineRun (hook)
```

## Do

- Name the test file after the hook (`useXxx.test.ts`), not the underlying utility module
- Cover both the pure helper functions and the hook logic in that single file
- Use the `usePipelineRun.test.ts` structure as the reference pattern

## Don't

- Don't create a test file named after a utility module when a hook wraps it — the hook
  will end up untested
- Don't split pure-function tests and hook tests into separate files when they belong to
  the same feature unit

---

**Keywords:** test file naming, hook coverage, useScrollBuffer, scrollBuffer, usePipelineRun, Vitest, convention
