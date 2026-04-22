# Vitest Mocking Named Module Exports

**Type:** Discovery

## Context

When testing code that imports named exports from a module (e.g., `import { stdout, stderr, debug } from '@src/utils/output'`), you need to mock those exports so tests can verify they were called. Vitest requires a specific pattern to make mocked named exports work correctly with `vi.mocked()`.

## What happened / What is true

Using `vi.mock()` without a factory function does not establish the module structure needed for `vi.mocked()` to work:

```typescript
// ❌ Fails: module structure not properly set up
vi.mock('@src/utils/output')
expect(vi.mocked(stderr).print).toHaveBeenCalled() // Error: vi.fn() is not a function
```

The factory function form **must** explicitly provide the mock implementations:

```typescript
// ✅ Works: factory establishes the export structure
vi.mock('@src/utils/output', () => ({
  stdout: { print: vi.fn() },
  stderr: { print: vi.fn() },
  debug: { print: vi.fn() }
}))
expect(vi.mocked(stderr).print).toHaveBeenCalled() // Works
```

## Do

- Use a factory function to mock modules with named exports: `vi.mock(path, () => ({ name1: ..., name2: ... }))`
- Create mock objects that match the real module's structure (same property names and types)
- Access mocks with `vi.mocked()` after they're set up via factory
- Set up mocks for all named exports the code under test actually uses

## Don't

- Call `vi.mock()` without a factory and expect `vi.mocked()` to work on named exports
- Assume vitest will auto-generate the module structure — you must provide it
- Mock only some exports while leaving others unmocked in multi-export modules

---

**Keywords:** vitest, mocking, named exports, factory function, vi.mock, vi.mocked
