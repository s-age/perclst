# chat Command: spawnInteractive Is Synchronous — Use mockImplementation for Throws

**Type:** Problem

## Context

Integration tests for the `chat` command need to simulate `spawnInteractive` throwing
an error. The standard pattern for async generators (`mockRejectedValue`) does not apply
here because `spawnInteractive` returns `void`, not a `Promise`.

## What is true

- `IClaudeCodeRepository.spawnInteractive(args: string[]): void` — returns `void`.
- `AgentDomain.chat(session): void` calls `spawnInteractive` synchronously.
- `AgentService.chat` is `async` but does not `await` the internal `agentDomain.chat`
  call (correct, since it is sync).
- Synchronous errors from `spawnInteractive` still propagate through the promise chain
  and are caught by `chatCommand`'s `try/catch`.

## Do

```ts
// Correct: synchronous throw via mockImplementation
function makeThrowingStub(err: Error) {
  const stub = buildClaudeCodeStub([])
  ;(stub.spawnInteractive as ReturnType<typeof vi.fn>).mockImplementation(() => {
    throw err
  })
  return stub
}
```

## Don't

- Use `mockRejectedValue` on `spawnInteractive` — it returns `void`, not a `Promise`.
- Use `mockResolvedValue` or `mockReturnValue(Promise.reject(...))`.

## Note

`chatCommand` has no `RateLimitError` catch block (unlike `resume`/`fork`/`survey`), so
rate limit errors fall into the generic handler and print `'Failed to start chat session'`.

---

**Keywords:** chat command, spawnInteractive, synchronous, void, mockImplementation, mockRejectedValue, stub, AgentDomain
