# Explicit Return Types for @typescript-eslint Rule

**Type:** Discovery

## Context

When the `@typescript-eslint/explicit-function-return-type` rule is enabled, all functions and arrow functions—including test helpers, internal nested functions, and fixture creators—require explicit return type annotations. This applies to the entire codebase, including test files.

## What happened / What is true

- **Exported parser functions often already have return types** — production code functions typically come with annotations; the violations cluster in test helpers and internal nested functions.

- **Arrow functions in test files are not exempt** — Helper functions like `assistantEvent()`, `userToolResultEvent()`, and fixture creators like `makeSourceFile()` must have explicit return type annotations.

- **Nested arrow functions need return types** — Internal functions defined inside larger functions (e.g., `flush()` inside `buildTurns()`) must be annotated with `(): void` or a concrete type.

- **Library-imported types should use `import type`** — When importing types purely for type annotations (e.g., `SourceFile` from ts-morph), use `import type { Type }` to satisfy the `consistent-type-imports` rule and avoid polluting the runtime import list.

- **Inline return type annotations work for arrow functions** — Arrow functions can have return types specified between parameters and the arrow: `const fn = (x: number): string => ...`

## Do

- Always annotate arrow function helpers with explicit return types
- Use `import type` when importing types from libraries for annotation purposes only
- Annotate internal nested functions (e.g., `const flush = (): void => { ... }`)
- For object-returning arrow functions, place the return type annotation on the same line as the parameter list

## Don't

- Assume test helper functions are exempt from the rule
- Mix runtime and type-only imports without using `import type` for the types
- Leave internal nested functions unannotated; they must have return types too

---

**Keywords:** explicit-function-return-type, eslint, arrow-functions, test-helpers, import-type, typescript
