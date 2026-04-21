# `done` Field Must Be Declared in Both TypeScript Types and Zod Schema

**Type:** Problem

## Context

When adding the `done` field to pipeline tasks so that completed tasks are
skipped on subsequent runs, it must appear in two places. Missing either causes
silent data loss or type errors.

## What happened / What is true

Zod strips unknown keys by default during parsing. If `done` is declared in
`src/types/pipeline.ts` but omitted from the Zod schema in
`src/validators/cli/runPipeline.ts`, the following happens:

- A task runs, `done: true` is written to the file
- On the next run the pipeline file is re-parsed through the Zod schema
- Zod silently discards `done: true` (unknown key → stripped)
- The task is never considered done and runs again every time

## Do

- Declare `done` in **both** `src/types/pipeline.ts` and the Zod schema in
  `src/validators/cli/runPipeline.ts`
- After adding any new field to a pipeline task type, check the Zod schema
  matches

## Don't

- Assume TypeScript types alone are enough — Zod schemas are the runtime gate
- Rely on Zod's default mode to pass through fields not in the schema

---

**Keywords:** pipeline, done, Zod, schema, unknown keys, strip, persistence, runPipeline
