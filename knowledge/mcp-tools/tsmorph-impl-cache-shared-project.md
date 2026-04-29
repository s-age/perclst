# ts-morph ImplCache Breaks When Project Is Shared Across Tests

**Type:** Problem

## Context

`tsCallGraphParser.ts` caches interface-implementation mappings in a `WeakMap<Project, ImplCache>`
(`projectImplCache`). The cache is built once per `Project` instance. When the same `Project` is
reused across tests (e.g. via `beforeAll`), files added in later tests are absent from the
cache, causing implementation resolution to fail silently.

## What happened

Sharing a `Project` in `beforeAll` improved performance but broke `ts_call_graph` tests: classes
added after the first cache build were not recognized as implementing their interfaces because the
`ImplCache` still reflected the file set at the time of first access.

## Do

- Track a `fileCount` field inside each `ImplCache` entry alongside the resolved implementations.
- On every cache lookup, compare `project.getSourceFiles().length` against the stored `fileCount`.
  If they differ, discard and rebuild the cache entry.
- This is a no-op cost in production (Project is stable); in tests it triggers a rebuild only
  when new source files are added.

## Don't

- Don't assume a `WeakMap<Project, …>` cache is safe when the `Project` is mutated by adding
  files after the first cache build.
- Don't skip the file-count guard just because production use is stable — tests will break if the
  guard is removed.

---

**Keywords:** ts-morph, Project, WeakMap, cache, ImplCache, tsCallGraphParser, interface, implementation, beforeAll, file count, invalidation
