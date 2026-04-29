# Vitest Hoisted Mocks for Cross-Mock Dependencies

**Type:** External

## Context

When writing vitest tests that mock multiple modules, `vi.mock()` callbacks execute
before test code but after the module scope is evaluated. If one mock needs to
reference a value from another mock (e.g. having `promisify` return a specific
`vi.fn()`), a plain module-level variable won't exist yet when the mock callback runs.

## What is true

`vi.hoisted()` runs its callback before any module loading, making the returned
values available inside `vi.mock()` definitions.

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

- `mocks.execAsync` is defined before `vi.mock('util', …)` is evaluated.
- Without `vi.hoisted()`, referencing a variable from the same scope inside
  `vi.mock()` throws "variable is not defined" at runtime.
- This pattern is vitest-specific; Jest uses `jest.doMock()` for similar cases.

## Do

- Use `vi.hoisted()` whenever a `vi.mock()` callback needs to reference a shared
  mock function defined elsewhere in the file.
- Collect all cross-mock shared values in a single hoisted block to keep the
  dependency chain visible.

## Don't

- Reference module-scope variables (defined outside `vi.hoisted()`) inside
  `vi.mock()` definitions — they are not yet initialised.
- Use `vi.hoisted()` for mocks that are only needed inside a single test case;
  keep those inline with `vi.fn()`.

---

**Keywords:** vitest, vi.hoisted, vi.mock, mock, hoisted, circular dependency, module mocking, promisify
