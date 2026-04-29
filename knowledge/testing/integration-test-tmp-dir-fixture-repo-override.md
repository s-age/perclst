# Override TsAnalysisRepository in Integration Tests Using Tmp-Dir Fixtures

**Type:** Discovery

## Context

MCP integration tests that operate on temporary-directory fixture files don't need
cross-file TypeScript resolution. Letting them inherit the tsconfig-backed `TsAnalyzer`
from the DI container causes multi-second startup times and 5 s timeouts.

## What happened / What is true

When `TsAnalysisRepository` in the container was corrected to use `infras.tsAnalyzer`
(the full, tsconfig-backed project), MCP integration tests using `setupContainer` began
timing out because the full project (~100 `src/**/*` files) was being loaded for every
test that only needed a small tmp-dir fixture.

The fix is to override `repos.tsAnalysisRepo` in those tests with a lightweight instance
that has `skipAddingFilesFromTsConfig: true`, scoping the project to only the files
explicitly added during the test.

## Do

Override `repos.tsAnalysisRepo` in any integration test that operates on a tmp-dir fixture
and does not need cross-file resolution:

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

## Don't

- Don't let fixture-only integration tests inherit the global tsconfig-backed analyzer —
  it loads the entire src tree and causes timeouts.
- Don't revert `setupRepositories.ts` to use `tsAnalyzerSkipAddFiles` as a workaround —
  that breaks cross-file reference resolution in production.

---

**Keywords:** integration test, TsAnalysisRepository, TsAnalyzer, skipAddingFilesFromTsConfig, setupContainer, repos override, tmp-dir fixture, timeout, test performance
