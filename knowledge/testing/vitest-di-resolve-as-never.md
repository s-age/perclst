# Vitest: Assigning to `vi.mocked(container).resolve` Requires `as never`

**Type:** Problem

## Context

Applies when mocking `container.resolve` by property assignment in a `beforeEach` block
so the mock can be reset between tests. The container is auto-mocked via `vi.mock(...)`.

## What happened / What is true

`vi.mocked(container).resolve` has a complex intersection type:

```ts
(<T>(id: Identifier) => T) & MockInstance<(<T>(id: Identifier) => T)> & { ... }
```

Assigning a `vi.fn().mockImplementation(...)` fails because the RHS is typed as only
`<T>(id: Identifier) => T`, missing the `MockInstance<...>` part. Even
`as unknown as typeof container.resolve` does not work because `typeof container.resolve`
strips the `MockInstance` intersection.

**Fix:** use `as never`:

```ts
vi.mocked(container).resolve = vi.fn().mockImplementation((token: unknown) => {
  if (token === TOKENS.Foo) return mockFoo
  if (token === TOKENS.Bar) return mockBar
  return null
}) as never
```

`token` must be typed as `unknown` because `Identifier = string | symbol`.

## Property assignment vs `vi.mocked(container.resolve).mockImplementation`

| Pattern | When to use |
|---|---|
| `vi.mocked(container).resolve = vi.fn()... as never` | Reset per `beforeEach`; the property itself is replaced |
| `vi.mocked(container.resolve).mockImplementation(...)` | Container is auto-mocked and cleared globally; no property reassignment needed |

## Do

- Use `as never` when assigning a new `vi.fn()` to `vi.mocked(container).resolve`
- Type the token parameter as `unknown` in the implementation function

## Don't

- Use `as unknown as typeof container.resolve` — it strips `MockInstance<...>`
- Use `string` or `symbol` as the token type — `Identifier` is `string | symbol`

---

**Keywords:** vitest, DI, dependency injection, container, resolve, as never, MockInstance, Identifier, property assignment, beforeEach, auto-mock
