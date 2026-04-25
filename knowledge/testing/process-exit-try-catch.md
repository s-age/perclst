# process.exit Inside try Block Is Re-Caught When Mocked

**Type:** Problem

## Context

When testing CLI handlers that call `process.exit()` inside a `try` block, mocking
`process.exit` to throw causes the thrown error to be caught by the surrounding
`catch` handler. This triggers unintended error-handling paths and can cause double
error messages or a second exit call.

## What happened

```ts
// Handler (BAD)
try {
  if (!query) {
    stderr.print('Query required')
    process.exit(1)      // ← mock throws here
  }
  await agentService.start(...)
} catch (error) {
  stderr.print('Failed to run agent', error)  // ← catches the mock throw
  process.exit(1)
}

// Test
vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit(1)') })
// Result: error printed twice, exit called twice
```

## Do

- Place input validation and guard-exit calls **before** the `try` block:
  ```ts
  if (!query) {
    stderr.print('Query required')
    process.exit(1)    // not inside try — mock throw propagates to test
  }
  try {
    await agentService.start(...)
  } catch (error) {
    stderr.print('Failed during agent execution', error)
    process.exit(1)
  }
  ```
- Reserve the `try/catch` for async operations and genuine runtime errors.

## Don't

- Don't call `process.exit()` inside a `try` block in handlers where tests mock exit
  as a throw.
- Don't share a single `try/catch` for both validation errors and runtime errors —
  they have different semantics and different expected outputs.

---

**Keywords:** process.exit, try-catch, mock, testing, vitest, CLI, guard, validation
