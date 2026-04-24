# Explicit Return Type Annotation Scope

**Type:** Discovery

## Context

When the `@typescript-eslint/explicit-function-return-type` lint rule is enabled, return type annotations are required on more function types than initially apparent. In test files and complex object structures, many arrow functions that seem exempt actually require types.

## What is true

Arrow functions in object literals always need return types, even if they appear to be configuration or mock setup:

- `{ isFile: (): boolean => true }` — method arrow functions in objects require types
- `{ getFilePath: (): string => '/path' }` — applies to all object properties
- This includes mock objects created in test setup (Dirent mocks, child process mocks, etc.)

Nested arrow functions (even without return statements) require return types:

- `const traverse = (path: string): void => { ... }` — recursive functions must be typed
- Inner functions are not exempt from the rule

Test file callbacks and vitest patterns:

- `beforeEach((): void => { ... })` — vitest callbacks themselves need return type
- `it('test', (): void => { ... })` — both sync and async need explicit types
- Async versions use `(): Promise<void> => { ... }` for async it blocks

Async generator functions need explicit return types:

- `(async function* (): AsyncGenerator<Buffer, void, unknown> { ... })()` — generators require full type
- The return type replaces the implicit generator typing

Complex function return types must be fully typed:

- When returning objects with mock properties (vitest), include all properties in the return type
- Use `ReturnType<typeof vi.fn>` for mock function types
- Include all nested properties: `{ stdin: { write: ..., end: ... }, stdout: AsyncGenerator<...>, ... }`

## Do

- Add return types to all arrow functions in object literals and mock definitions
- Explicitly type nested and inner arrow functions
- Use `: void` for functions with no return value
- Fully specify complex return object types when mixing mocks and real types
- Check eslint output for column numbers to locate arrow functions inside complex expressions

## Don't

- Assume callbacks like `it()` or `beforeEach()` are exempt (the callbacks themselves need types)
- Leave arrow functions untyped in object properties, even in test setup code
- Omit return types from async generators or async functions

---

**Keywords:** eslint, explicit-function-return-type, arrow functions, return types, test callbacks, vitest, async generator
