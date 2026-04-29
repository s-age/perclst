## TsAnalysisRepository was wired to TsAnalyzer with skipAddingFilesFromTsConfig:true

`setupRepositories` was passing `infras.tsAnalyzerSkipAddFiles` to `TsAnalysisRepository`.
That instance creates a ts-morph `Project` with `skipAddingFilesFromTsConfig: true`, so the
project starts empty — only files explicitly requested via `addSourceFileAtPath` are ever in
scope.  As a result, `findReferences()` on any symbol could only find references within the
single file that was passed to `getSourceFile()`.  Cross-file references were silently missing.

**Fix**: wire `TsAnalysisRepository` to `infras.tsAnalyzer` (loads all `src/**/*` from
`tsconfig.json`) in `setupRepositories.ts`.

**Why the tests didn't catch it**: unit/repository tests create `new TsAnalyzer()` directly
(tsconfig-backed), so they always had the full project.  MCP integration tests used
`setupContainer` which went through the DI path — those tests timed out (5 s) once the fix
was applied because loading ~100 src files takes a few seconds.  Fixed by overriding
`repos.tsAnalysisRepo` with a `skipAddingFilesFromTsConfig: true` instance in integration
tests that only operate on tmp-dir fixture files and don't need cross-file resolution.

**Pattern for integration tests using tmp-dir fixtures**:
```ts
setupContainer({
  config: buildTestConfig(dir),
  repos: {
    tsAnalysisRepo: new TsAnalysisRepository(
      new TsAnalyzer({ skipAddingFilesFromTsConfig: true })
    )
  }
})
```

Discovered 2026-04-29 while fixing ts_get_references missing cross-file callers.
