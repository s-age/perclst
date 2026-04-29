# ts-morph Project Initialization Cost and Test Sharing

**Type:** External

## Context

Applies when writing integration tests that involve `TsAnalyzer` (or any class that constructs a
`ts-morph` `Project` internally). Each `new Project(...)` call loads TypeScript stdlib type
definitions from disk, which is expensive regardless of `skipAddingFilesFromTsConfig`.

## What is true

- `new Project({ skipAddingFilesFromTsConfig: true })` still costs ~**1.8 s** per call because
  TypeScript's language service reads `lib.es5.d.ts` and friends from disk.
- `TsAnalyzer` uses **lazy initialization**: the `Project` is not created in the constructor but
  on the first `getSourceFile()` call.
- Using `beforeEach(() => setupContainer())` creates a new `TsAnalyzer` — and therefore a new
  `Project` — for every test. For 11 tests this was 21 s; moving to `beforeAll` reduced it to
  1.2 s.

## Do

- Use `beforeAll` + a single `setupContainer()` call when tests do not rely on per-test container
  configuration, so the `Project` instance is shared across the suite.

## Don't

- Don't call `setupContainer()` in `beforeEach` when the only reason is habit — verify first
  whether tests truly need isolated containers.

---

**Keywords:** ts-morph, Project, initialization, performance, beforeAll, beforeEach, TsAnalyzer, integration test, stdlib
