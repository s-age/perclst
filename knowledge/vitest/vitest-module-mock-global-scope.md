# vi.mock() Applies Globally to the Entire Test File

**Type:** External

## Context

Applies when writing Vitest tests that use `vi.mock()` at the module level. A common mistake is expecting some tests within the same file to use the real implementation while others use a mock — this is not possible with module-level mocks.

## What happened / What is true

- `vi.mock('module', ...)` at the top of a test file applies to **all tests in that file**.
- There is no way to have some tests use the real module and others use the mock within the same file.
- Tests that do not configure a return value will see `undefined` returned by the mock function.
- `vi.clearAllMocks()` in `beforeEach` resets call history but does not restore the real implementation.

## Do

- Set up mock return values in `beforeEach` so every test starts from a known state
- Move tests that need the real implementation to a separate test file
- Use `vi.clearAllMocks()` in `beforeEach` to reset call counts between tests

```typescript
vi.mock('crypto', () => ({ randomUUID: vi.fn() }))

describe('generateId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRandomUUID.mockReturnValue('valid-uuid-string')
  })
  it('calls randomUUID once', () => { ... })
})
```

## Don't

- Mix tests that expect real behavior and tests that expect mocked behavior in the same file
- Assume a mocked function returns a meaningful value without configuring `mockReturnValue`

---

**Keywords:** vitest, vi.mock, mock scope, module mock, global mock, test isolation, clearAllMocks
