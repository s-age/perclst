# logger.ts Has Two Intentionally Uncovered Branches

**Type:** Discovery

## Context

When reviewing branch coverage for `src/utils/logger.ts`, two branches remain uncovered after a complete unit test suite is written. This is expected and by design — future engineers should not chase these gaps.

## What happened / What is true

Two branches in `logger.ts` are structurally unreachable or not worth testing:

1. **`hexToFg` / `hexToBg` invalid-input guard** (`if (!m) return ''`, lines 11 and 18)
   - Defensive guard for malformed hex strings (e.g. non-`#RRGGBB` input).
   - All callers pass valid `#RRGGBB` values; the guard is never triggered in normal usage.
   - Hitting it would require deliberately passing an invalid hex — not worth a dedicated test.

2. **`error()` level guard false branch** (`if (this.level <= LogLevel.ERROR)`, line 50)
   - `LogLevel.ERROR = 3` is the maximum enum value.
   - The false branch is unreachable with any valid `LogLevel` input.
   - Would require a type-cast like `setLevel(99 as LogLevel)` — not worth testing.

These gaps keep branch coverage for `logger.ts` at approximately 89% by design.

## Do

- Accept ~89% branch coverage on `logger.ts` as intentional.
- Document the reason in code comments if the gap generates CI noise.

## Don't

- Don't add tests that pass invalid hex strings or cast `LogLevel` to arbitrary numbers just to hit these branches.
- Don't treat these gaps as bugs or regressions.

---

**Keywords:** logger, branch coverage, vitest, uncovered branch, hexToFg, hexToBg, LogLevel, intentional gap, logger.ts
