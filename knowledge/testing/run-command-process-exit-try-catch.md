# Commands That Call process.exit(): Use try/catch, Not rejects.toThrow

**Type:** Discovery

## Context

Commands that call `process.exit()` on failure (e.g. `runCommand` with `--batch`) throw
a mocked exit error. Using `rejects.toThrow` as the outer assertion makes it impossible
to also assert on side effects (stdout, UI output) because the `expect` chain short-circuits.

## What is true

```ts
// ❌ Problematic: cannot assert on side effects after expect chain rejects
await expect(runCommand(...)).rejects.toThrow()
expect(vi.mocked(stdout).print).toHaveBeenCalledWith('Aborted.')  // may not run

// ✅ Correct: swallow the exit error, then assert on side effects
try {
  await runCommand(PIPELINE_PATH, { batch: true })
} catch {
  /* expected process.exit() mock throw */
}
expect(vi.mocked(stdout).print).toHaveBeenCalledWith('Aborted.')
```

The `catch` block intentionally swallows the mocked `process.exit` error, allowing all
subsequent assertions on observable side effects to execute.

## Do

- Use `try/catch` when the test's goal is asserting on output or state after an exit.
- Keep one assertion per test — mix `rejects.toThrow` and side-effect assertions in
  different test cases.

## Don't

- Chain side-effect assertions after `rejects.toThrow` on the same `await` expression.

---

**Keywords:** process.exit, try/catch, rejects.toThrow, runCommand, batch, side effects, assertion, mocked exit
