# ts_get_references — Cycle Detection with Visited Set

**Type:** Discovery

## Context

`ts_get_references` supports recursive traversal: when symbol A is referenced inside function B,
it can continue to find all callers of B. Mutually recursive functions (A → B → A) would cause
infinite recursion without a guard.

## What happened / What is true

`collectReferencesRecursive` guards against cycles using `visited: Set<string>`.

- Keys are formatted as `"filePath::symbolName"` — combining both dimensions avoids false hits
  when the same symbol name appears in different files.
- The set is passed by reference through all recursive calls so a single traversal accumulates
  all visited nodes globally.
- Before recursing into a caller, the function checks `visited.has(key)` and adds the key before
  descending — standard DFS cycle guard.

## Do

- Key visited sets as `"filePath::symbolName"` (or equivalent two-part composite) whenever
  traversing a symbol graph that spans multiple files
- Pass the set by reference so cross-branch visits are recorded

## Don't

- Don't key only by symbol name — collisions across files will incorrectly cut traversal short
- Don't key only by file path — multiple symbols in the same file will share the same entry

---

**Keywords:** ts_get_references, recursive traversal, cycle detection, visited set, infinite recursion, DFS, ts-morph
