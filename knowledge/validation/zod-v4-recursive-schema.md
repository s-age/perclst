# Zod v4 Recursive Schema Pattern

**Type:** External

## Context

When a Zod schema must reference itself — for example, a pipeline task type that can
contain nested pipeline tasks — you need a recursive definition. Zod v4 requires a
specific pattern using `z.lazy()` and an explicit type annotation to avoid both
TypeScript errors and runtime temporal dead zone (TDZ) crashes.

## What happened / What is true

- Use a `let` declaration (not `const`) with an explicit `z.ZodType<T>` annotation.
- Wrap the self-reference inside `z.lazy(() => schemaVar)` so the callback only fires at parse time (after assignment).
- Use `z.union` (not `z.discriminatedUnion`) when the union includes a recursive member annotated as `z.ZodType<T>`.

```ts
let pipelineTaskSchema: z.ZodType<PipelineTask>

const nestedPipelineTaskSchema: z.ZodType<NestedPipelineTask> = z.object({
  type: z.literal('pipeline'),
  name: z.string().min(1),
  tasks: z.array(z.lazy((): z.ZodType<PipelineTask> => pipelineTaskSchema)).min(1),
})

pipelineTaskSchema = z.union([agentTaskSchema, scriptTaskSchema, nestedPipelineTaskSchema])
```

- **`let` not `const`**: `const` triggers a TDZ error because `z.lazy()`'s closure captures the variable before it is assigned.
- **`z.union` not `z.discriminatedUnion`**: `z.discriminatedUnion` expects concrete `ZodObject` instances; a `z.ZodType<T>` annotation does not satisfy that constraint.

## Do

- Declare the recursive schema variable with `let` and an explicit `z.ZodType<T>` annotation.
- Wrap self-references with `z.lazy(() => schemaVar)`.
- Use `z.union` for any union that includes the recursive schema.

## Don't

- Don't use `const` for a recursively-referenced schema — it causes a runtime TDZ crash.
- Don't use `z.discriminatedUnion` when one member is typed as `z.ZodType<T>` rather than a concrete `ZodObject`.

---

**Keywords:** zod, zod v4, recursive schema, z.lazy, TDZ, union, discriminatedUnion, z.ZodType, pipeline, nested
