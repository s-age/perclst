# Vitest Callbacks and Arrow Functions Need Explicit Return Types

**Type:** Problem

## Context

When the @typescript-eslint/explicit-function-return-type rule is enabled, vitest callbacks and arrow functions assigned to variables must have explicit return type annotations. This is especially true for test fixtures and mock setup functions.

## What happened / What is true

- All vitest callbacks (`describe`, `it`, `beforeEach`, `afterEach`) require explicit `: void` return type annotations
- Async test functions need `: Promise<void>` return type annotations
- Arrow functions assigned to variables via ternary operators require return types on **each branch**
- Nested arrow functions in mock functions need return types (e.g., `vi.fn()` callbacks)
- Object literal return types must specify the structure when not immediately obvious

Examples:
```typescript
// ❌ Missing return types
describe('test', () => { ... })
it('test', () => { ... })
beforeEach(() => { ... })

// ✅ Correct
describe('test', (): void => { ... })
it('test', (): void => { ... })
beforeEach((): void => { ... })
it('async test', async (): Promise<void> => { ... })

// Arrow functions in conditionals - each branch needs a type
const fn = condition 
  ? (s: string) => s              // ❌ Missing return type
  : (s: string): string => s      // ✅ Has return type
```

## Do

- Add `: void` to all `describe()`, `it()`, `beforeEach()`, `afterEach()` callbacks
- Use `: Promise<void>` for async test functions
- Annotate arrow function return types when assigning via ternary or conditional expressions
- Specify return type for nested arrow functions in `vi.fn()` mock callbacks
- Use `eslint --fix` to auto-format complex type annotations after adding them

## Don't

- Assume optional properties on an object parameter make the parameter itself optional (it doesn't)
- Leave one branch of a ternary without a return type annotation
- Forget return types when returning object literals from arrow functions
- Mix annotated and unannotated arrow function branches in ternary expressions

---

**Keywords:** vitest, typescript-eslint, explicit return types, callbacks, arrow functions, testing
