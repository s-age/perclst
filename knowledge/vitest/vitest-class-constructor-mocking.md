# Vitest Class Constructor Mocking with `new` Keyword

**Type:** Discovery

## Context

When testing code that instantiates classes with `new ClassName()` (e.g., `new Table(config)`), vitest's `vi.mock()` factory patterns may fail if the factory returns an object without properly implementing constructor semantics. This matters when mocking third-party classes in unit tests.

## What happened / What is true

JavaScript's `new` keyword creates an object and binds `this` to it, then calls the constructor function. A factory function returning an object doesn't participate in this `this`-binding process.

**Fails:** Using a factory that returns an object doesn't properly assign mocked methods:
```javascript
vi.mock('cli-table3', () => ({
  default: vi.fn(() => mockTableInstance)  // ❌ fails
}))
```

**Works:** Using a regular function (not arrow) that assigns methods to `this`:
```javascript
vi.mock('cli-table3', () => ({
  default: vi.fn(function () {
    this.push = mockTableInstance.push
    this.toString = mockTableInstance.toString
    return this  // ✅ works
  })
}))
```

When `new Table()` is called, JavaScript creates a new object, binds `this`, calls the vi.fn function with that context, and the constructor assigns methods to `this`.

## Do

- Use `function() { ... }` (not arrow `() => { ... }`) as the vi.fn argument
- Assign all mocked methods to `this` inside the constructor
- Return `this` to give the instance the mocked methods
- Test that Table methods are called via the mockTableInstance references

## Don't

- Use arrow functions as vi.fn arguments for constructors (no `this` binding)
- Return an object from the factory expecting it to become the instance
- Mix factory-returned objects with `new`-keyword instantiation

---

**Keywords:** vitest, mocking, constructor, new keyword, class instantiation, vi.mock, this binding
