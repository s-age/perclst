# Mocking process.exit in vitest Tests

**Type:** Problem

## Context

When testing functions that call `process.exit(1)` for validation errors, the exit call needs to stop function execution. Otherwise, code after the exit call still runs, causing unexpected behavior and test failures.

## What happened / What is true

A simple no-op mock of `process.exit` does not halt execution. The function continues to the next statement, calling downstream dependencies with invalid state.

```ts
// ❌ Wrong — function continues after process.exit(1)
const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
await surveyCommand(undefined) // calls stderr.print, then process.exit(1), then calls startCommand()
```

The test then fails when checking `expect(startCommand).not.toHaveBeenCalled()` because the mock didn't stop execution.

## Do

- Throw an error from the mocked `process.exit` to halt execution:

```ts
const exitError = new Error('process.exit(1)')
const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
  throw exitError
})

try {
  await expect(surveyCommand(undefined)).rejects.toThrow(exitError)
  expect(exitSpy).toHaveBeenCalledWith(1)
  expect(startCommand).not.toHaveBeenCalled()
} finally {
  exitSpy.mockRestore()
}
```

- Wrap with `expect(...).rejects.toThrow()` to assert the function throws as expected

## Don't

- Use `mockImplementation(() => undefined)` or `mockImplementation(() => {})` — these don't stop execution
- Assume `process.exit` mock automatically prevents downstream code from running

---

**Keywords:** process.exit, vitest mocking, spy mock, function execution halt, validation testing
