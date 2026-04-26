# Vitest: `mockImplementation` Fails When Parameter Type Is Narrower Than `unknown`

**Type:** Problem

## Context

Applies when mocking a function whose parameter is typed as `unknown` (e.g., a validator
function `parse(raw: unknown): ParsedResult`). TypeScript's function parameter contravariance
rejects an implementation with a more specific parameter type.

## What happened / What is true

TypeScript **parameter contravariance**: a function `(x: NarrowType) => R` is not assignable
where `(x: unknown) => R` is expected, because the narrower function cannot handle all inputs
that the broader contract allows.

```ts
// ERROR — Argument of type '(input: Record<string, unknown>) => ...'
// is not assignable to parameter of type '(raw: unknown) => ...'
vi.mocked(parseAnalyzeSession).mockImplementation((input: Record<string, unknown>) => ({
  sessionId: input.sessionId as string,
}))
```

## Fix 1: Keep parameter as `unknown`, cast inside

```ts
vi.mocked(parseAnalyzeSession).mockImplementation((raw: unknown) => {
  const input = raw as Record<string, unknown>
  return {
    sessionId: input.sessionId as string,
    format: (input.format as 'text' | 'json' | undefined) ?? 'text',
    printDetail: (input.printDetail as boolean | undefined) ?? false,
  }
})
```

## Fix 2: Cast the entire implementation with `as never`

```ts
vi.mocked(parseFoo).mockImplementation(mockParseFoo as never)
```

Use `as never` when the mock variable is defined separately and configured per-test via
`mockReturnValue`/`mockResolvedValue`.

## Do

- Match the mock parameter type exactly to the real function's parameter type (`unknown`)
- Cast inside the implementation body: `const input = raw as Record<string, unknown>`
- Use `as never` when passing an external `vi.fn()` variable as the implementation

## Don't

- Narrow the parameter type in a `mockImplementation` callback — TypeScript will reject it
- Cast the callback itself to `any` to suppress the error (blocked by `local/no-any`)

---

**Keywords:** vitest, mockImplementation, contravariance, unknown, TypeScript, parameter type, as never, TS2345, mock, parse
