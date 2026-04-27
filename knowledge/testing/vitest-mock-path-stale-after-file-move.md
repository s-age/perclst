# vi.mock() Paths Not Updated by Import-Only sed During File Move

**Type:** Problem

## Context

When moving a TypeScript source file to a new path, a common approach is to use `sed` to bulk-update `import ... from` statements. However, Vitest `vi.mock()` calls use the same module path string but have different syntax — they are not caught by an import-scoped replacement pattern.

## What happened / What is true

Moving `src/cli/display.ts` to `src/cli/view/display.ts` and running `sed` to replace
`from '@src/cli/display'` left `vi.mock('@src/cli/display')` calls unchanged in test files.
The code compiled cleanly but tests failed at runtime:

```
TypeError: [Function printResponse] is not a spy or a call to a spy!
```

The mock was registered against the old path; the import resolved to the new path; they never
matched, so the mock was silently ignored and the real function was called instead.

## Do

- After any file move, run a broad path replacement that catches both `from '...'` and
  `vi.mock('...')` in one pass:
  ```bash
  grep -rl "@src/cli/display" src --include="*.ts" \
    | xargs sed -i '' "s|@src/cli/display|@src/cli/view/display|g"
  ```
- Run `ts_checker` immediately after moving a file — it catches stale mock paths before
  they reach CI.

## Don't

- Don't restrict sed substitutions to `from '...'` syntax alone when renaming or moving modules.
- Don't assume a clean TypeScript build means mocks are wired correctly — type errors and
  mock-path mismatches are orthogonal.

---

**Keywords:** vi.mock, vitest, file move, sed, module path, stale mock, import path, refactor, rename
