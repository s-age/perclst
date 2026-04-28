# ts-morph findReferences Always Includes the Declaration Site

**Type:** External

## Context

When using ts-morph's `findReferences()` for the `ts_get_references` MCP tool, a symbol with no
external callers still returns a non-empty result. This affects integration test fixtures that
try to assert "zero references."

## What is true

`ReferencedSymbol.getReferences()` includes the declaration site as a reference entry.
A symbol that exists in a file but has no external callers returns 1 reference (the declaration
itself) — not 0.

**Workaround to achieve truly empty references in tests:** place the fixture file under a path
containing `__tests__`. The `extractReferences()` parser filters references from paths containing
`__tests__` when `include_test = false` (the default):

```ts
if (!options?.includeTest && refFilePath.includes('__tests__')) continue
```

By placing the fixture at `dir/__tests__/source.ts`, the declaration reference is filtered out,
yielding an empty array.

This is a side effect of the `include_test` filtering. Use it only when specifically testing the
"no external references" case where the declaration is an implementation detail.

## Do

- Expect at least 1 result from `findReferences()` for any existing symbol (the declaration site)
- Place fixture files under `dir/__tests__/` to get a truly empty references result in tests

## Don't

- Don't expect `findReferences()` to return 0 results for an existing-but-unused symbol
- Don't use the `__tests__` path trick except when specifically testing "no external references"

---

**Keywords:** ts-morph, findReferences, declaration site, include_test filter, empty references, ts_get_references, integration test fixture
