# vitest hoisted mocks for circular dependencies

**Type:** External

## Context

When setting up mocks in vitest test files, `vi.mock()` statements execute at import time before your test code runs. If you need to pass a mock function from one `vi.mock()` into another (for example, having `promisify` return a specific mock function), you cannot reference a variable defined in the same scope—the variable doesn't exist yet.

## What is true

Use `vi.hoisted()` to create mocks before module loading:

```ts
const { mocks } = vi.hoisted(() => ({
  mocks: {
    execAsync: vi.fn()
  }
}))

vi.mock('util', () => ({
  promisify: vi.fn(() => mocks.execAsync)
}))
```

The `vi.hoisted()` callback runs before module loading, so `mocks.execAsync` is available to `vi.mock()` callbacks. Without this pattern, referencing mocks inside `vi.mock()` definitions causes "variable is not defined" errors.

This is vitest-specific; Jest uses `jest.doMock()` for similar patterns.

## Do

- Use `vi.hoisted()` when you need to pass a mock into another `vi.mock()` definition
- Define all mocks you'll share across multiple `vi.mock()` calls in the same hoisted block

## Don't

- Reference variables defined outside `vi.hoisted()` inside `vi.mock()` definitions—they won't be available
- Use this for mocks that are only needed within a single test; keep those inline with `vi.fn()`

---

**Keywords:** vitest, mocking, vi.hoisted, circular dependency, module mocking
