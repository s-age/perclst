# Zod v4: Casting Mock Return Values for Strict Schema Types

**Type:** Problem

## Context

After upgrading to Zod v4, test mocks that pass `{}` or partial objects as Zod schema types
fail TypeScript strict checks. Applies to any test using `vi.mocked(z.boolean)`,
`vi.mocked(z.string)`, etc. with `mockReturnValue`.

## What happened / What is true

Zod v4 tightened internal types (`_ZodBoolean`, `_ZodString`, etc.), making partial object
casts fail. Using `as any` is also blocked by the project's `local/no-any` ESLint rule.

**Cast via `unknown`:**

```ts
// Bad — blocked by local/no-any rule
vi.mocked(z.boolean).mockReturnValue({} as any)

// Good — cast through unknown to the actual return type
const mock = {} as unknown as ReturnType<typeof z.boolean>
vi.mocked(z.boolean).mockReturnValue(mock)
```

**Avoid `this` in vi.fn callbacks — use closure instead:**

When a mock needs to return `this` to support method chaining, using a regular function with
`this` causes TS2683 ("this implicitly has type 'any'"). Replace with a shared result object:

```ts
// Bad — TS2683: 'this' implicitly has type 'any'
const mockFn = vi.fn(function () { return this })

// Good — closure with shared result object
const result = { min: vi.fn(), max: vi.fn() }
result.min.mockReturnValue(result)
result.max.mockReturnValue(result)
```

## Do

- Cast Zod mock values as `{} as unknown as ReturnType<typeof z.xxx>`
- Model chainable mocks with a shared plain object where each method returns the object

## Don't

- Use `as any` — blocked by the `local/no-any` rule
- Use `this` in `vi.fn(function() {...})` without an explicit `this: SomeType` annotation

---

**Keywords:** Zod v4, vitest, mockReturnValue, unknown cast, ReturnType, this, TS2683, local/no-any, chainable mock, vi.fn
