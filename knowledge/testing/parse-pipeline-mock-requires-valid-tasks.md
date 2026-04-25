# parsePipeline Mock Must Return a Valid Pipeline (≥1 Task)

**Type:** Problem

## Context

When writing tests for child pipeline loading (`childPipeline.test.ts`), mocks for
`loaderDomain.loadRaw` must return data that passes Zod validation inside `parsePipeline`.
Returning a minimal-but-empty pipeline causes a `ValidationError` at runtime.

## What happened / What is true

`parsePipeline` runs Zod validation on whatever `loaderDomain.loadRaw` returns. A mock
returning `{ tasks: [] }` throws `ValidationError` because the schema requires at least
one task. The error surfaces inside the service, not at the mock boundary, making the
root cause non-obvious.

## Do

- Use a mock with at least one valid task:
  ```ts
  const rawChildPipeline = { tasks: [{ type: 'agent', task: 'child work' }] };
  ```
- When a test fails inside the service with `ValidationError`, check whether the mock
  data satisfies the full schema, not just the shape.

## Don't

- Don't use `{ tasks: [] }` as a `loadRaw` mock return value — Zod rejects empty task
  arrays.
- Don't assume a structurally-correct mock bypasses validation; `parsePipeline` always
  runs the full schema check.

---

**Keywords:** parsePipeline, loaderDomain, loadRaw, childPipeline, ValidationError, Zod validation, test mock, empty tasks
