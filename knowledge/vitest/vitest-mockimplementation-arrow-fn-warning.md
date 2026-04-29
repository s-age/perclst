# Vitest Warns When mockImplementation Uses an Arrow Function for a Class Mock

**Type:** Problem

## Context

Applies when mocking a class constructor via `vi.mocked(SomeClass).mockImplementation(...)` in
Vitest. The warning fires regardless of whether the tests pass, so it can be missed during
development and only noticed later in CI output.

## What happened / What is true

Using an arrow function as the `mockImplementation` callback for a class mock triggers:

```
[vitest] The vi.fn() mock did not use 'function' or 'class' in its implementation
```

Arrow functions have no `this` binding, so Vitest cannot perform constructor-style `new`-binding on
them. Vitest emits the warning when it detects a class mock backed by an arrow function.

The tests may still pass, but the warning indicates incorrect semantics and should be fixed.

## Do

- Use a regular `function` expression so Vitest can bind `this` correctly:
  ```typescript
  // ✅ silent
  vi.mocked(Table).mockImplementation(function () { return mockTableInstance as never })
  ```

## Don't

- Don't use an arrow function as the callback for class mocks:
  ```typescript
  // ❌ warns
  vi.mocked(Table).mockImplementation(() => mockTableInstance as never)
  ```
- Don't ignore the warning — even when tests pass, the mock semantics are wrong

---

**Keywords:** vitest, mockImplementation, arrow function, class mock, constructor, this binding, warning, vi.mocked
