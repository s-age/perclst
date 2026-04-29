# TsAnalysisRepository Wired to Wrong TsAnalyzer in DI Container

**Type:** Problem

## Context

`setupRepositories.ts` wires `TsAnalysisRepository` with one of two `TsAnalyzer` instances.
Using the wrong one causes cross-file references to be silently missing — no error is thrown.

## What happened / What is true

`setupRepositories` was passing `infras.tsAnalyzerSkipAddFiles` to `TsAnalysisRepository`.
That instance creates a ts-morph `Project` with `skipAddingFilesFromTsConfig: true`, so the
project starts empty — only files explicitly added via `addSourceFileAtPath` are ever in
scope. As a result, `findReferences()` could only find references within the single file
passed to `getSourceFile()`. Cross-file references were silently missing.

The bug was invisible in unit/repository tests because those create `new TsAnalyzer()`
directly (tsconfig-backed, full project). The broken DI path was only exercised by MCP
integration tests that went through `setupContainer`.

## Do

- Wire `TsAnalysisRepository` to `infras.tsAnalyzer` (loads all `src/**/*` from
  `tsconfig.json`) in `setupRepositories.ts`.
- When diagnosing silently missing cross-file references, check which `TsAnalyzer` instance
  the repository received from the container.

## Don't

- Don't wire `TsAnalysisRepository` to `infras.tsAnalyzerSkipAddFiles` — that instance is
  intended only for scoped, single-file operations that don't need cross-file resolution.

---

**Keywords:** TsAnalysisRepository, TsAnalyzer, skipAddingFilesFromTsConfig, DI wiring, setupRepositories, cross-file references, missing references, silent bug
