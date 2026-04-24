# Optional Parameters in Return Type Refactoring

**Type:** Problem

## Context

When adding explicit return type annotations to CLI command functions with optional object parameters, existing test calls that omit the parameter will fail. TypeScript distinguishes between a parameter with optional properties and an optional parameter itself, causing tests to break during refactoring.

## What happened / What is true

TypeScript requires explicit default values on parameters to make them truly optional at the call site:

- `function cmd(options: { prompt?: string })` — parameter is **required**, only its properties are optional
- `function cmd(options: { prompt?: string } = {})` — parameter is **optional**, callers can omit it entirely

When refactoring to add return types, tests calling functions without the parameter argument will fail with "Cannot read properties of undefined".

## Do

- Add a default value (`= {}`) when refactoring optional object parameters
- Check test files for callers that omit the parameter
- Ensure both signature and tests are updated together

## Don't

- Assume optional properties make the entire parameter optional
- Leave tests failing during refactoring thinking it's unrelated to the signature change
- Add default values retrospectively only when tests fail

---

**Keywords:** typescript, optional parameters, return type annotations, refactoring, CLI commands
