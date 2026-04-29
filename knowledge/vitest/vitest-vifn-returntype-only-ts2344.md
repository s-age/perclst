# Vitest `vi.fn`: Single Return-Type Argument Causes TS2344

**Type:** External

## Context

Supplement to `vitest-v2-vi-fn-type-arg.md`. In Vitest v2+, `vi.fn()` accepts one type
argument that must be a **full function signature** (a callable type). Passing a return
type alone — e.g., `vi.fn<Promise<ScriptResult>>()` — is a distinct mistake from the
old two-argument form and produces a different TypeScript error.

## What happened / What is true

When a single non-function type is passed as the type argument, Vitest's type system
interprets it as a `Procedure | Constructable` constraint. Since `Promise<ScriptResult>`
is not callable, TypeScript reports:

```
TS2344: Type 'Promise<ScriptResult>' does not satisfy the constraint 'Procedure | Constructable'.
```

This is different from the two-argument error (`TS2558: Expected 0-1 type arguments, but got 2`)
and can appear after partially fixing v1→v2 migration if only the argument count was corrected
without converting to the function-signature form.

## Fix

Pass the entire function signature as the one type argument:

```ts
// Wrong — return type alone, causes TS2344
vi.fn<Promise<ScriptResult>>()

// Correct — full function signature
vi.fn<(command: string, cwd: string) => Promise<ScriptResult>>()

// Also correct — no type argument; rely on mockResolvedValue/mockReturnValue inference
vi.fn()
```

## Do

- Always supply the full function signature `(args) => ReturnType` as the single type arg
- Omit type arguments entirely when inference from `mockReturnValue` / `mockResolvedValue` suffices

## Don't

- Pass a return type alone as the single type argument — it triggers TS2344
- Assume fixing the argument count (2→1) from v1 is enough; verify the argument is a function type

---

**Keywords:** vitest, vi.fn, TS2344, Procedure, Constructable, type argument, return type, mock, v2, migration
