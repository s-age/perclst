# ts_get_references Supports Class Method Lookup

**Type:** Discovery

## Context

When using the `ts_get_references` MCP tool to find all usages of a symbol, the default
behavior only covered top-level symbols (classes, functions, variables, interfaces, type aliases).
This entry documents the extended `ClassName.methodName` format introduced to support class methods.

## What happened / What is true

- `ts_get_references` now accepts a dot-separated `symbol_name` to target a class method.
- Format: `"ClassName.methodName"` (e.g., `"AnalyzeDomain.analyze"`).
- Implementation is in `src/infrastructures/tsAnalyzer.ts` → `getReferences()`.
- When a `.` is detected the symbol name is split into `className` / `methodName`; the class is
  looked up first, then the method is resolved on it before calling `findReferences()`.
- Backward compatible: plain symbol names (no dot) continue to use the original top-level lookup.
- Static, async, private, and protected methods are all supported by ts-morph's `findReferences()`.
- Cross-file method lookup is **not** supported — the method must be declared in the target file.

```typescript
if (symbolName.includes('.')) {
  const [className, methodName] = symbolName.split('.', 2)
  const classDecl = sourceFile.getClass(className)
  if (classDecl) {
    symbol = classDecl.getMethod(methodName)
  }
}
```

## Do

- Use `"ClassName.methodName"` when you need references to a specific method, not the whole class.
- Verify the method is declared in the file you pass as `file_path`.
- Test via unit tests (`src/infrastructures/__tests__/tsAnalyzer.test.ts`) — MCP tool calls may
  silently return empty results if the server process is stale (see `mcp-server-process-reload.md`).

## Don't

- Don't use `"ClassName#methodName"` — the dot separator is the only supported format.
- Don't expect results for methods defined in other files (cross-file lookup not yet implemented).

---

**Keywords:** ts_get_references, class method, dot notation, ts-morph, MCP tool, symbol lookup, getReferences, method references
