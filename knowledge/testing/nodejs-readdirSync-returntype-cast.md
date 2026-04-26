# Node.js `readdirSync` Mock: Use `ReturnType<>` Cast Instead of `string[]`

**Type:** Problem

## Context

Tests that mock `fs.readdirSync` (or `fsSync.readdirSync`) with a hardcoded `string[]` cast
break when Node.js type definitions are updated to tighten the return type.

## What happened / What is true

A Node.js type-definition update tightened `readdirSync` overloads so that `mockReturnValue`
requires `Dirent<NonSharedBuffer>[]`, not `string[]`. Casting via `as unknown as string[]`
then fails:

```
TS2345: Argument of type 'string[]' is not assignable to
        parameter of type 'Dirent<NonSharedBuffer>[]'.
```

**Fix:** cast to `ReturnType<typeof fsSync.readdirSync>` — it tracks the actual return type
even when Node.js typings change again:

```ts
// Before — breaks when Node.js typings update
vi.mocked(fsSync.readdirSync).mockReturnValue(['a.json'] as unknown as string[])

// After — follows the real return type
vi.mocked(fsSync.readdirSync).mockReturnValue(
  ['a.json'] as unknown as ReturnType<typeof fsSync.readdirSync>
)
```

**Related tightening — `existsSync` parameter:**

`existsSync`'s mock implementation parameter type changed from `string` to
`PathLike` (`string | Buffer | URL`). Add the import and annotate accordingly:

```ts
import type { PathLike } from 'fs'

vi.mocked(fsSync.existsSync).mockImplementation((p: PathLike) => p === '/expected/path')
```

## Do

- Cast mock return values to `ReturnType<typeof fsSync.readdirSync>` (not `string[]`)
- Import `PathLike` from `fs` when typing `existsSync` mock parameters

## Don't

- Hardcode `string[]` or `Dirent[]` as the cast target — Node.js typings change over time
- Use `as any` to work around type mismatches in fs mocks

---

**Keywords:** Node.js, readdirSync, Dirent, NonSharedBuffer, existsSync, PathLike, mockReturnValue, ReturnType, vitest, TS2345, fs mock
