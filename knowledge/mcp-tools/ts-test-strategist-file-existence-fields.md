# ts_test_strategist: test_file_exists and expected_test_file_path Fields

**Type:** Problem

## Context

Applies when an agent uses `ts_test_strategist` to gather context before writing a unit test. If the
target test file does not yet exist, agents need reliable signals to avoid wasted or failed reads.

## What happened / What is true

Agents exhibited two anti-patterns when the test file was absent:

- Attempted to `Read` the test file before confirming it exists — failed silently or raised errors.
- Used `Glob` to find existing test files as style references — unnecessary and wasted tokens.

Root cause: `TestStrategyResult` only exposed `corresponding_test_file: string | null`. Agents did
not consistently interpret `null` as "file does not exist" and fell back to heuristics.

**Fix — two explicit fields added to `TestStrategyResult`:**

- `test_file_exists: boolean` — derived from whether `findTestFile()` returned non-null.
- `expected_test_file_path: string` — always populated; equals `corresponding_test_file` when the
  file exists, otherwise the canonical path `{dir}/__tests__/{stem}.test{ext}` (via
  `canonicalTestFilePath()` in `testFileDiscovery.ts`).

**Procedure enforcement:** `procedures/test-unit/implement.md` was rewritten with explicit STEP 1–4
labels and ⛔ prohibitions inside the Write step.

## Do

- Check `test_file_exists` before deciding whether to `Read` or create the test file.
- Use `expected_test_file_path` as the write target — it is always populated.
- Trust `test_file_exists: true` as confirmation the file is on disk (`findTestFile` uses
  `existsSync` internally).

## Don't

- Don't `Read` a test file before `test_file_exists` is confirmed `true`.
- Don't `Glob` for reference test files to infer naming style — the strategist provides the path.
- Don't rely on `corresponding_test_file !== null` as an existence check in agent code; use the
  dedicated boolean field instead.

---

**Keywords:** ts_test_strategist, test_file_exists, expected_test_file_path, TestStrategyResult, canonicalTestFilePath, testFileDiscovery, unit test, anti-pattern, file existence
