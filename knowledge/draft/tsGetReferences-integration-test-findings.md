# tsGetReferences Integration Test Implementation

**Keywords**: ts-morph, findReferences, cross-file references, extractReferences filter, __tests__ directory

## Problem: Empty References vs. Declaration Site

**Discovery**: ts-morph's `findReferences()` includes the declaration site as a reference entry.

For a symbol that exists in a file but has NO external callers (no consumer files reference it), `findReferences()` returns 1 reference: the declaration site. This is NOT empty. However, TypeScript LS and ts-morph distinguish between "definition" and "references" conceptually, but `ReferencedSymbol.getReferences()` includes the definition as an entry.

**Impact**: Cannot achieve an empty references array for an existing-but-unused symbol through normal `findReferences()` flow. The declaration site is always present.

## Solution: Use `__tests__` Directory Filter

**Discovery**: The `extractReferences()` parser filters references from paths containing `__tests__` when `include_test = false` (the default).

```ts
if (!options?.includeTest && refFilePath.includes('__tests__')) continue
```

By placing the fixture file at `dir/__tests__/source.ts`, the declaration reference gets filtered out, resulting in truly empty references. This is a side effect of the `include_test` filtering meant for excluding test-file references from production analysis.

**Gotcha**: This exploits the filter rather than testing normal behavior. It works but feels like a hack. Use only when testing the specific intent of "no external references" (where the declaration is implementation detail).

## Cross-File Reference Discovery in Integration Tests

**Discovery**: When using `TsAnalyzerSkipAddFiles` (empty project that doesn't auto-load tsconfig files), you must explicitly add all relevant files to the ts-morph project before `findReferences()` can discover them.

The fixture files are NOT in the actual project's tsconfig. They're in a tmp dir. ts-morph's project doesn't know about consumer files unless explicitly added.

**Solution**: Pre-add consumer files by calling `service.analyze(consumerPath)` or directly calling `getSourceFile(consumerPath)` on the TsAnalyzer singleton before calling the MCP tool. This triggers `addSourceFileAtPath` which adds the file to the project.

```ts
const service = container.resolve<TsAnalysisService>(TOKENS.TsAnalysisService)
service.analyze(consumer1Path)  // Adds consumer1.ts to project
service.analyze(consumer2Path)  // Adds consumer2.ts to project
// Now findReferences can discover calls in both files
```

**Important**: The singleton TsAnalyzer is the same instance used by the service and repo, so pre-adding files in test setup affects subsequent calls within that test.

## Integration Test Pattern for MCP Tools with Service DI

1. Create fixtures in tmp dir (via `makeTmpDir()`)
2. Call `setupContainer({ config: buildTestConfig(dir) })` to set up DI
3. For multi-file scenarios: resolve services and pre-add related files
4. Call the MCP tool function
5. Parse `result.content[0].text` as JSON and assert

Note: Each `beforeEach` creates a fresh tmp dir AND fresh container with fresh TsAnalyzer singleton, so cross-test contamination is not an issue.
