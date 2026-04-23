# Mocking Class Constructors in Vitest Requires a Regular Function

**Type:** Problem

## Context

Applies when mocking a class whose constructor is called with `new` in the source code under test. Using an arrow function or a plain object as the mock factory causes the mock to fail silently or produce unexpected errors.

## What happened / What is true

- Tests that called `new Table({...})` failed with "process.exit unexpectedly called" when the mock was a factory function returning an object.
- JavaScript's `new` keyword creates a new object, binds `this` to it, then calls the constructor. An arrow function does not have its own `this`, so it cannot participate in this protocol correctly.
- A `vi.fn(function() { ... })` with a regular function (not arrow) correctly intercepts `new` calls.

```javascript
// ✅ Works — regular function has `this` binding
vi.mock('cli-table3', () => ({
  default: vi.fn(function () {
    this.push = mockTableInstance.push
    this.toString = mockTableInstance.toString
    return this
  })
}))

// ❌ Fails — arrow function has no `this`
vi.mock('cli-table3', () => ({
  default: vi.fn(() => ({ push: vi.fn(), toString: vi.fn() }))
}))
```

## Do

- Use a regular `function()` (not an arrow function) when mocking a class constructor with `vi.fn()`
- Assign mocked methods to `this` inside the constructor mock and return `this`

## Don't

- Use arrow functions as constructor mocks — they cannot bind `this`
- Return a plain object from an arrow factory when the source uses `new`

---

**Keywords:** vitest, class mock, constructor mock, new keyword, this binding, vi.fn, arrow function, cli-table3
