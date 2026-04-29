# ts-call-graph Integration Test Constraints Under skipAddingFilesFromTsConfig

**Type:** Discovery

## Context

When testing `tsCallGraphParser` via the MCP integration test path, `TsAnalyzer` is configured
with `skipAddingFilesFromTsConfig: true`. This setting has three non-obvious effects that
determine how fixture files and test inputs must be structured.

## What happened / What is true

- **buildImplCache only sees explicitly loaded files**: `project.getSourceFiles()` returns only
  files added via `addSourceFileAtPath`. Interface implementations in separate files are
  invisible to the impl cache. Put the interface and its implementation class in the same
  fixture file.
- **Arrow function exports need an explicit `entry`**: `getCallGraph` without `entry` filters
  exports by `kind === 'function'`. Arrow const exports (`export const fn = () => {}`) are
  classified differently and silently skipped. Pass `entry: 'fnName'` to bypass the filter.
- **node_modules property-access calls are untestable**: `path.resolve()`-style calls cannot
  reach the `declFilePath.includes('/node_modules/')` branch (line 139) because without
  `@types/node`, `expr.getSymbol()` returns null and exits early. Identifier-style imports
  (`import { join } from "path"`) work because ts-morph resolves the binding.

## Do

- Co-locate interface and implementation class in the same fixture file
- Pass `entry: 'fnName'` explicitly when the subject is an arrow const export
- Use identifier-style imports in fixtures when testing import-related branches

## Don't

- Don't rely on cross-file interface resolution under `skipAddingFilesFromTsConfig`
- Don't omit `entry` and expect arrow const exports to appear in results
- Don't count on `node_modules` branch coverage from property-access (`path.resolve`) fixtures

---

**Keywords:** tsCallGraph, tsCallGraphParser, skipAddingFilesFromTsConfig, TsAnalyzer, arrow function,
buildImplCache, node_modules, integration test, entry parameter, fixture
