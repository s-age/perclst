# ts-morph Cross-File References Require Explicit File Pre-Loading

**Type:** Discovery

## Context

`TsAnalyzerSkipAddFiles` is a ts-morph project that does not auto-load tsconfig files. When testing
cross-file reference scenarios for `ts_get_references`, consumer files in a tmpdir must be
explicitly added to the project before `findReferences()` can discover them.

## What is true

Fixture files in a tmpdir are not part of any real tsconfig. ts-morph will not discover references
in consumer files unless they have been explicitly added via `addSourceFileAtPath`.

`TsAnalyzerSkipAddFiles` is a singleton shared by `TsAnalysisService` and its repo. Pre-adding
files in test setup affects all subsequent calls within that test. Each `beforeEach` that calls
`setupContainer` creates a fresh singleton, so cross-test contamination is not a concern.

**Pattern to pre-add consumer files before calling the MCP tool:**
```ts
const service = container.resolve<TsAnalysisService>(TOKENS.TsAnalysisService)
service.analyze(consumer1Path)  // triggers addSourceFileAtPath for consumer1.ts
service.analyze(consumer2Path)  // triggers addSourceFileAtPath for consumer2.ts
// findReferences now discovers calls in both files
```

Full integration test sequence:
1. Create fixtures in tmpdir (`makeTmpDir()`)
2. Call `setupContainer({ config: buildTestConfig(dir) })` in `beforeEach`
3. Resolve the service and pre-add all consumer files via `service.analyze(path)`
4. Call the MCP tool function
5. Parse `result.content[0].text` as JSON and assert

## Do

- Pre-add all consumer files by calling `service.analyze(path)` before invoking `ts_get_references`
- Use `beforeEach` + `setupContainer` to ensure a fresh singleton and clean state per test

## Don't

- Don't expect `findReferences()` to discover references in files that haven't been added to the
  project
- Don't rely on tsconfig auto-loading for tmpdir fixtures

---

**Keywords:** ts-morph, TsAnalyzerSkipAddFiles, findReferences, cross-file references, addSourceFileAtPath, explicit pre-load, singleton, integration test
