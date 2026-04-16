---
name: unit-test-implementor
description: Patterns and conventions for writing *.test.ts files in this project. Load when creating or editing unit test files. Covers file placement, mock style, vitest imports, and case structure. Does NOT run ts_test_strategist — use procedures/test-unit.md for full agent-driven workflow.
paths:
  - src/**/*.test.ts
---

Test files live at `{dir}/__tests__/{stem}.test.ts` relative to the source file.

## Imports

Always import from vitest explicitly — no globals:

```ts
import { vi, describe, it, expect, beforeEach } from 'vitest'
```

## Mock style

**Interface mocks** (injected via constructor): declare at module scope as a typed object literal with `vi.fn()` values. Reset in `beforeEach` with `vi.clearAllMocks()`.

```ts
const mockRepo: ISessionRepository = {
  save: vi.fn(),
  load: vi.fn(),
  exists: vi.fn(),
}
```

**Module mocks** (external imports): use `vi.mock()` at the top level.

```ts
vi.mock('@src/lib/something', () => ({ doThing: vi.fn() }))
```

**No mocks needed**: pure functions with no injected deps — test directly.

## Class under test

Instantiate in `beforeEach`, never at module scope:

```ts
describe('SessionDomain', () => {
  let domain: SessionDomain

  beforeEach(() => {
    vi.clearAllMocks()
    domain = new SessionDomain(mockRepo)
  })
})
```

## Case structure

- Order: happy path first, then branches, then error paths
- Describe block per class or function; nested `describe` for methods with multiple branches
- `it` descriptions: `'should <verb> <outcome>'` for behavior, or just `'<verb>s <outcome>'`
- Use `vi.mocked(mock.method).mockResolvedValue(...)` — not `(mock.method as vi.Mock)`

## Assertions

```ts
// async throws
await expect(fn()).rejects.toThrow(MyError)

// mock called with
expect(mock.save).toHaveBeenCalledWith(expected)

// exact call count
expect(mock.save).toHaveBeenCalledTimes(1)
```

## What NOT to do

- Never use `console.log` in tests
- Never import from `node_modules` internals
- Never test implementation details — test observable behavior
- Never duplicate tests already present in the file (read first if file exists)
