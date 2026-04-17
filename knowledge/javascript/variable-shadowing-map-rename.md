# Variable Shadowing When Renaming a Map to a Loop-Local Name

**Type:** Problem

## Context

When refactoring code that uses a `Map<K, V>` and renaming it to a shorter identifier,
it is easy to introduce a shadowing bug if a local variable inside a loop is given the
same name as the map. TypeScript and build tools (e.g. tsup/esbuild) do not flag this
because the shadowing is syntactically valid.

## What happened / What is true

- `scriptRetryCount` (a `Map<number, number>`) was renamed to `retryCount`.
- Inside a loop block, a new local was declared as `const retryCount = (retryCount.get(i) ?? 0) + 1`.
- The local `retryCount` shadowed the outer `Map`, making `.get()` call itself recursively and `.set()` fail silently.
- The bug was **not caught by TypeScript or the build step** — only spotted by reading the diff.

```ts
// BAD — shadows the outer Map
const retryCount = (retryCount.get(i) ?? 0) + 1
retryCount.set(i, retryCount)   // retryCount is now a number, not a Map

// GOOD — use a distinct name for the incremented value
const count = (retryCount.get(i) ?? 0) + 1
retryCount.set(i, count)
```

## Do

- Use a distinct local name (e.g. `count`, `nextCount`) for the incremented value, keeping the Map name for the Map.
- Review diffs manually after rename refactors that touch loop-local variable names.

## Don't

- Don't give a loop-local the same name as an outer `Map` or any outer mutable container.
- Don't assume TypeScript will catch shadowing bugs — they are syntactically valid and compile without error.

---

**Keywords:** variable shadowing, Map, rename, refactor, retryCount, loop, TypeScript, tsup, silent bug
