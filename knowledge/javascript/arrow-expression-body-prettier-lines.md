# Arrow Expression Bodies Avoid Prettier Line Expansion Under max-lines-per-function

**Type:** Problem

## Context

ESLint's `max-lines-per-function` rule (limit: 50) counts every line from the opening
keyword to the closing `}`. Prettier reformats arrow functions with block bodies
(`{ return ... }`) into multi-line form, unexpectedly inflating the count.

## What happened / What is true

- `max-lines-per-function` counts from the `async function` (or arrow) keyword to its
  closing `}`, inclusive.
- Arrow functions with **block bodies** (`{ ... }`) are expanded to 3 lines by prettier:
  opening brace, body, closing brace.
- Arrow functions with **expression bodies** (no braces) stay on 1 line; prettier does
  not expand them.

Example that gets expanded (3 lines after prettier):
```ts
onTaskDone: () => { pipelineFileService.savePipeline(...) }
```

Expression body that stays on 1 line:
```ts
onTaskDone: (): void => pipelineFileService.savePipeline(...)
```

The explicit `void` return-type annotation satisfies `explicit-function-return-type`.

## Do

- Use expression-body arrows (`(): void => expr`) for single-expression callbacks when
  the function is near the `max-lines-per-function` limit.
- Add an explicit return-type annotation (e.g., `: void`) to satisfy the lint rule.

## Don't

- Don't use block-body arrows (`() => { ... }`) inside already-long functions — prettier
  expands them and may push the parent over the line limit.

---

**Keywords:** max-lines-per-function, ESLint, prettier, arrow function, expression body, block body, line count, explicit-function-return-type
