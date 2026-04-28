# Spreading `process` in Vitest Mocks Loses Prototype Methods

**Type:** Problem

## Context

When mocking the Node.js `process` object in Vitest unit tests via object spread
(`{ ...process, exit: mockExit }`), prototype methods such as `removeListener`, `on`,
and `addListener` are silently dropped. These methods live on the `EventEmitter` prototype
and are not own enumerable properties, so spread omits them.

## What happened / What is true

- `{ ...process }` copies only own enumerable properties — the prototype chain is not included
- Methods like `removeListener`, `on`, `once` are inherited from `EventEmitter.prototype`
- Code that calls `process.removeListener(...)` will throw `TypeError: process.removeListener is not a function`
  when running against a naive spread mock
- The bug appears only when the code path under test actually invokes the missing method,
  making it easy to miss until that branch is exercised

## Do

- Explicitly add every `process.*` method the code under test calls:

```ts
global.process = {
  ...process,
  exit: mockExit,
  once: mockOnce,
  removeListener: vi.fn(),
} as any
```

- Audit the full code path for all `process.*` calls before writing the mock

## Don't

- Don't assume object spread captures all callable methods on `process`
- Don't mock only the methods you noticed upfront — check the implementation for all `process.*` usages

---

**Keywords:** process mock, Vitest, object spread, prototype methods, removeListener, non-enumerable, unit test, EventEmitter
