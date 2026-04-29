# Mocking Dependency Injection Containers in Tests

**Type:** Discovery

## Context

Code that uses a DI container to resolve services at runtime needs those service instances to be mocked in tests. Vitest's standard mocking approach doesn't handle the container's `resolve()` method well because it returns different service instances based on the token passed in.

## What happened / What is true

The container's `resolve()` method acts like a router — it takes a token and returns the corresponding service instance. To mock this, you must mock `resolve` itself with a function that dispatches based on the token:

```typescript
vi.mocked(container).resolve = vi.fn((token: symbol | string): unknown => {
  if (token === TOKENS.SessionService) return mockSessionService
  if (token === TOKENS.AgentService) return mockAgentService
  if (token === TOKENS.Config) return mockConfig
  throw new Error(`Unknown token: ${String(token)}`)
})
```

This pattern allows the tested code to call `container.resolve(TOKENS.SessionService)` and get your mock back, while the function still validates that only expected tokens are requested.

## Do

- Create separate mock instances for each service your code depends on
- Set up the container mock in `beforeEach()` so it's reset between tests
- Return the same mock instance every time for a given token (not new instances)
- Use `mockResolvedValue()` and `mockImplementation()` on the returned service mocks to control behavior per test

## Don't

- Try to use `vi.mock()` on the container itself — it won't work for token routing
- Create a single generic mock that tries to handle all tokens — keep service mocks separate
- Forget to handle the token comparison — use `===` for exact matches on symbol/string tokens

---

**Keywords:** vitest, dependency injection, DI container, resolve pattern, service mocking
