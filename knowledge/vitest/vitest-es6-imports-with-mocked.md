# ES6 Imports with vi.mocked() for Module Mocks

**Type:** Discovery

## Context

When writing vitest unit tests that mock modules with `vi.mock()`, accessing those mocked modules in test bodies requires using ES6 imports paired with `vi.mocked()` wrapper. Using `require()` in test bodies triggers linting errors and violates project conventions.

## What happened / What is true

- `vi.mock()` at module level hoists mock definitions before imports
- Imported names can be accessed and type-checked via `vi.mocked(importName)`
- Using `require()` in test bodies violates `@typescript-eslint/no-require-imports` linter rule
- ES6 imports + `vi.mocked()` wrapper is the codebase convention for all vitest tests

Correct pattern:
```typescript
import { parseSweepSession } from '@src/validators/cli/sweepSession'
vi.mock('@src/validators/cli/sweepSession')

// In test body:
vi.mocked(parseSweepSession).mockReturnValue(...)
```

## Do

- Import mocked modules as ES6 imports at the top level
- Wrap imported names with `vi.mocked()` when setting up mocks in test bodies
- Use `vi.hoisted()` if you need module-level setup code that runs before `vi.mock()`

## Don't

- Use `require()` to import mocked modules in test bodies
- Mix ES6 imports and `require()` for the same mocked module
- Assume `vi.mocked()` is needed for non-mocked imports (it's only for mocked ones)

---

**Keywords:** vitest, mocking, vi.mocked, ES6 imports, require, linting
