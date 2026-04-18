# ts_get_references — Per-Traversal Caller Memoization

**Type:** Discovery

## Context

During recursive reference traversal, multiple references within the same file may all be enclosed
by the same parent function. Without memoization, `collectReferencesRecursive` would be invoked
redundantly for the same caller symbol, re-traversing the same subtree multiple times.

## What happened / What is true

`collectReferencesRecursive` uses `callerRefsCache: Map<string, RecursiveReferenceInfo[]>` to
memoize results within a single top-level traversal call.

- Keys follow the same `"filePath::symbolName"` composite format as the visited set.
- The cache is created once at the start of the top-level call and threaded through all recursive
  calls — it is **not** shared across separate top-level invocations.
- On a cache hit, the stored result is returned immediately without re-traversing the subtree.

## Do

- Create the memoization cache at the top-level entry point and pass it down
- Scope the cache to a single traversal — do not persist it between tool calls

## Don't

- Don't cache across separate invocations of the tool — caller graphs can change between calls
- Don't omit the cache when a caller may be reached through multiple reference paths in the
  same traversal

---

**Keywords:** ts_get_references, memoization, caller cache, recursive traversal, duplicate subtree, performance, ts-morph
