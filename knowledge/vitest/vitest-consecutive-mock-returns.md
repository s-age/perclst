# Vitest Mocking Consecutive Calls with Different Returns

**Type:** Discovery

## Context

When testing code that calls the same mocked function multiple times in sequence, and each call should return a different value (or have different side effects), using `mockReturnValue()` fails because it sets a single return value for all invocations. This matters when testing path manipulation, data transformations, or multi-step operations that use the same utility function repeatedly.

## What happened / What is true

- `mockReturnValue()` returns the same value for every call to the mocked function
- `mockReturnValueOnce()` allows chaining to specify distinct return values for consecutive calls in order
- If a test calls `join('/abs/path', 'done')` and then `join('done', 'file.json')`, each needs its own return value
- Without separate mocking, the second call returns the first call's value, causing test assertions to fail on the actual vs. expected result

## Do

- Use `mockReturnValueOnce()` chained multiple times when a mocked function is called consecutively with different expected returns:
  ```typescript
  vi.mocked(join)
    .mockReturnValueOnce('/absolute/path/to/done/file.json')  // first call
    .mockReturnValueOnce('done/file.json')                     // second call
  ```
- Order mock returns to match the code's call sequence
- Document why consecutive mocks are needed (e.g., absolute vs. relative path distinction)

## Don't

- Use `mockReturnValue()` for functions called multiple times if different returns are required
- Assume a single mock setup covers all calls to that function — test one call sequence per mock setup

---

**Keywords:** vitest, mockReturnValueOnce, consecutive calls, mocking patterns, test setup
