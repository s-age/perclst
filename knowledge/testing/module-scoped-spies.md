# Module-Scoped Spies with beforeEach Reset

**Type:** Discovery

## Context

When writing vitest unit tests that mock multiple functions (like `process.exit` and `console.error`), each test needs consistent access to those spies to verify calls. Creating spies individually in every test creates boilerplate and obscures the common setup.

## What happened / What is true

Spies can be created at module scope (before the `describe` block) and then reset between tests using `vi.clearAllMocks()` in `beforeEach()`:

```typescript
const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('exit called')
})
const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('functionName', () => {
  beforeEach(() => {
    vi.clearAllMocks()  // Resets call history between tests
  })
  
  it('test 1', () => { /* spy available here */ })
  it('test 2', () => { /* spy available here */ })
})
```

`vi.clearAllMocks()` clears call history while keeping the mocks active, achieving proper test isolation without repeated spy setup.

## Do

- Create spies at module scope before `describe`
- Use `vi.clearAllMocks()` in `beforeEach()` to reset call history between tests
- Reference the module-scoped spies directly in all test cases

## Don't

- Create new spies inside individual test cases (boilerplate)
- Use `vi.restoreAllMocks()` in `beforeEach` if you want to keep mocks active across tests
- Skip `beforeEach` reset if tests share spies (leads to false positives)

---

**Keywords:** vitest, spies, mocking, test setup, module scope, beforeEach, vi.clearAllMocks
