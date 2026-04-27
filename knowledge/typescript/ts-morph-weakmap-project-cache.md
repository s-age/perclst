# WeakMap-keyed Cache for ts-morph Project

**Type:** Discovery

## Context

When a ts-morph analysis function scans all source files on every call (e.g., finding concrete implementations of an interface), the cost is O(files × classes) per invocation. This becomes significant when traversing a call graph that crosses many DI boundaries. Applies to the `parsers/` layer in perclst's MCP TypeScript analysis tools.

## What is true

- `findConcreteImplementations` in `tsCallGraphParser.ts` originally re-scanned all source files on each call.
- A module-level `WeakMap<Project, Map<string, Callee[]>>` eliminates redundant scans: the first call builds the full index; all subsequent calls are O(1) `Map.get()`.
- ts-morph's `Project` object is effectively a singleton per analysis session — stable and safe as a WeakMap key.
- Multiple projects are isolated automatically (each `Project` instance has its own cache entry).
- When the `Project` is garbage-collected, its cache entry is freed with it — no memory leak.
- The inner map key is `"InterfaceName.methodName"` (string), built by enumerating all classes and their `implements` declarations at index-build time.
- The `parsers/` layer may hold module-level state; I/O is forbidden, but pure memoization is within bounds.

## Do

- Use `WeakMap<Project, ImplCache>` at module level for any ts-morph parser that performs repeated full-project scans.
- Build the full index eagerly at cache-fill time, not lazily per lookup.
- Key the inner `Map` with a composite string like `"InterfaceName.methodName"`.
- Retrieve `Project` via `sourceFile.getProject()` — it returns the same instance throughout a session.

## Don't

- Don't use a plain `Map<string, ImplCache>` keyed by project path — it holds strong references and leaks if the `Project` is replaced or discarded.
- Don't mutate ts-morph's `Project` object directly to store cache data.
- Don't perform the full file scan inside the lookup path; always index eagerly.

---

**Keywords:** ts-morph, WeakMap, cache, Project, memoization, findConcreteImplementations, tsCallGraphParser, performance, parsers, implements, call-graph
