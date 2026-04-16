# ScriptPipelineTask Uses a Nested `rejected` Object

**Type:** Discovery

## Context

`ScriptPipelineTask` supports routing failed tasks to another task for retry. The schema
design choice — flat fields vs. a nested object — has correctness implications enforced
at the Zod validation layer.

## What happened / What is true

- The schema uses `rejected: { to: string, max_retries?: number }` (nested object), **not**
  `rejects_to: string` + `max_retries: number` (flat fields).
- With the flat design, `max_retries` could be written without `rejects_to`, creating an
  inconsistent configuration that would silently be ignored.
- The nested design structurally eliminates that problem: if `rejected` exists, `to` is
  required (enforced by Zod).

## Do

- Use the `rejected` object to declare rejection routing:
  ```json
  { "rejected": { "to": "implement", "max_retries": 3 } }
  ```
- Let Zod enforce the co-presence of `to` whenever `rejected` is present.

## Don't

- Don't flatten `rejected.to` and `rejected.max_retries` into the task's top-level fields.
- Don't write `max_retries` at the task root level — it belongs inside `rejected`.

---

**Keywords:** ScriptPipelineTask, rejected, rejects_to, max_retries, Zod schema, pipeline task schema
