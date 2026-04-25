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

## ReturnType<typeof vi.fn> is also affected

`ReturnType<typeof vi.fn>` resolves to `Mock<Procedure | Constructable>` in v2+ — a broad type that is **not assignable** to specific function types. This surfaces when a mock is passed to a function that expects a concrete signature (e.g., a port interface):

```ts
// Error: Mock<Procedure | Constructable> not assignable to (fn: (prev: T[]) => T[]) => void
let setItems: ReturnType<typeof vi.fn>
setItems = vi.fn()
applyResult(result, { setItems }) // ← TS2322 here
```

Fix: declare with `Mock<FnType>` (imported from `vitest`) and use typed `vi.fn()`:

```ts
import type { Mock } from 'vitest'

let setItems: Mock<(fn: (prev: T[]) => T[]) => void>
// in beforeEach:
setItems = vi.fn<(fn: (prev: T[]) => T[]) => void>()
```

## Do

- Use the single-argument function-signature form: `vi.fn<(a: A) => R>()`
- Declare typed mock variables as `Mock<FnType>` instead of `ReturnType<typeof vi.fn>`
- Search for `vi.fn<[` and `ReturnType<typeof vi.fn>` when upgrading from Vitest v1

## Don't

- Use the old tuple form `vi.fn<[T], void>()` — it is removed in v2+
- Use `ReturnType<typeof vi.fn>` as a variable type when the mock is passed to typed functions
- Assume `TS2558` / `TS2322` are unrelated to Vitest; check `vi.fn` call sites first

---

**Keywords:** vitest, vi.fn, Mock, ReturnType, type arguments, TS2558, TS2322, mock, v2, breaking change, tuple form
