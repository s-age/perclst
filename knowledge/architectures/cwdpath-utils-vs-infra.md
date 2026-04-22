# cwdPath Belongs in utils, Not infrastructures

**Type:** Discovery

## Context

`process.cwd()` reads OS state and could theoretically be classified as I/O that belongs in the `infrastructures/` layer. The question arose when adding `cwdPath()` to support absolute-path injection in agent instructions.

## What happened / What is true

- The gray-area rule for `src/utils/` is: "does a caller need to mock this to test deterministically?"
- For `cwdPath()`, the answer is no — both production code and test assertions can call `process.cwd()` and they always agree because the test process runs in the same directory.
- Additionally, the CLI layer cannot import from `repositories/` or `infrastructures/` per the layer rules, so placing it there would be architecturally illegal from the CLI's perspective.

## Do

- Place `cwdPath()` (and similar thin `process.cwd()` wrappers) in `src/utils/path.ts`.
- Apply the mock-necessity test when classifying borderline utilities: if callers don't need to mock it for deterministic tests, it belongs in `utils/`.

## Don't

- Don't move pure wrappers of `process.cwd()` to `infrastructures/` just because they touch OS state.
- Don't import from `infrastructures/` or `repositories/` in the CLI layer — it violates the unidirectional import rules.

---

**Keywords:** cwdPath, utils, infrastructures, layer rules, process.cwd, architecture, import rules, CLI layer, mock-necessity test
