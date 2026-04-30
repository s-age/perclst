# local/max-params Triggers When Extracting Business-Logic Functions

**Type:** Problem

## Context

When refactoring code — e.g. extracting pure business-logic functions out of
React hooks — the `local/max-params` ESLint rule (max 4 parameters) can
unexpectedly fail the build even when the function signature looked reasonable
in its original context.

## What happened / What is true

The `local/max-params` rule enforces a hard limit of 4 positional parameters
on any function. Functions that accepted individual arguments fine inside a
hook may exceed the limit once they become standalone utilities and take
additional context they previously closed over.

## Do

- Group related parameters into a single descriptor object before the count
  hits 4.
  ```ts
  // Before (5 params — fails)
  function handle(input: string, key: string, sessionId: string, label: string, ts: number) { … }

  // After (groups input+key — passes)
  type ChoiceInputEvent = { input: string; key: string };
  function handle(event: ChoiceInputEvent, sessionId: string, label: string, ts: number) { … }
  ```
- Name the descriptor type after its role (e.g. `ChoiceInputEvent`, not
  `Params`).

## Don't

- Don't add `// eslint-disable` comments — restructure the signature instead.
- Don't wait for CI to catch this; `ts_checker` (MCP tool) surfaces it
  immediately after extraction.

---

**Keywords:** local/max-params, ESLint, lint rule, parameter count, max params, refactor, extract function, React hook, descriptor object
