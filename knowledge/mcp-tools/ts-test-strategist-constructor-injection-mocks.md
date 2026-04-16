# ts_test_strategist: Constructor-Injected Dependencies Are Invisible to suggested_mocks

**Type:** Problem

## Context

`ts_test_strategist` derives `suggested_mocks` from value-level imports that appear in the
function body. This works well for module-level dependencies, but breaks down for classes
that receive dependencies via constructor injection.

## What happened / What is true

Constructor-injected dependencies (e.g. `this.repo`, `this.logger`) are accessed as
instance fields, not as import references. They do not appear as imports in the function
body, so `suggested_mocks` will not list them.

This is a known limitation of the import-based derivation strategy.

The `test-unit` procedure compensates by instructing the consuming agent: when `class_name`
is set on the analysis result, read the constructor signature and manually mock injected
dependencies with `vi.fn()`, independent of `suggested_mocks`.

## Do

- When `class_name` is present in the analysis output, inspect the constructor signature
  for injected dependencies
- Mock constructor parameters manually with `vi.fn()` even if they are absent from
  `suggested_mocks`

## Don't

- Don't assume `suggested_mocks` is exhaustive for class-based code
- Don't skip constructor inspection just because `suggested_mocks` is empty or short

---

**Keywords:** ts_test_strategist, suggested_mocks, constructor injection, class, vi.fn, dependency injection, known limitation
