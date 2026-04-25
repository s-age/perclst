# Vitest v2: vi.fn() Accepts One Type Argument Only

**Type:** External

## Context

Applies whenever TypeScript code uses `vi.fn()` with explicit type arguments in Vitest v2 or later (including v4, which this project uses). The change is a breaking API removal from v1.

## What happened / What is true

In Vitest v2, `vi.fn()` was changed to accept only **one** type argument — the full function signature — instead of the two-argument tuple form from v1.

```ts
// Vitest v1 — removed in v2; causes TS2558
const fn = vi.fn<[Arg1, Arg2], ReturnType>()

// Vitest v2+ — required form
const fn = vi.fn<(arg1: Arg1, arg2: Arg2) => ReturnType>()
```

Common patterns:

```ts
// setter-style mock
const setFoo = vi.fn<(v: Foo | null) => void>()

// poll-style mock (no args)
const poll = vi.fn<() => Foo | null>()
```

The TypeScript error `TS2558: Expected 0-1 type arguments, but got 2` is raised, but it does not mention `vi.fn` by name, making the root cause easy to miss.

## Do

- Use the single-argument function-signature form: `vi.fn<(a: A) => R>()`
- Search for `vi.fn<[` when upgrading from Vitest v1 to find all occurrences

## Don't

- Use the old tuple form `vi.fn<[T], void>()` — it is removed in v2+
- Assume `TS2558` is unrelated to Vitest; check `vi.fn` call sites first

---

**Keywords:** vitest, vi.fn, type arguments, TS2558, mock, v2, breaking change, tuple form
