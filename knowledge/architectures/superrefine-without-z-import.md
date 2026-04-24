# Using superRefine in validators/cli/ Without Importing z

**Type:** Discovery

## Context

In this codebase, `zod` may only be imported directly inside `validators/rules/`. Files
under `validators/cli/` must not import `z`. This creates a challenge when a CLI validator
needs cross-field validation, which Zod normally requires `z.ZodIssueCode.custom` and a
direct `z` reference to express.

## What happened / What is true

- `schema()` returns a `z.ZodObject`. Because `.superRefine()` is a method on that object,
  callers can chain it without ever importing `z` themselves.
- Inside the `superRefine` callback, `ctx.addIssue` accepts the string literal `'custom'`
  as the `code` field — `z.ZodIssueCode.custom` is not required.
- The return type becomes `ZodEffects` instead of `ZodObject`, but `typeof schema._output`
  still correctly reflects the output type.

```ts
// validators/cli/sweepSession.ts
const sweepSchema = schema({
  from: stringRule().optional(),
  to: stringRule().optional(),
  force: booleanRule().optional(),
}).superRefine((val, ctx) => {
  if (!val.from && !val.to) {
    ctx.addIssue({ code: 'custom', message: 'at least one of --from or --to is required' })
  }
  if (!val.to && !val.force) {
    ctx.addIssue({ code: 'custom', message: '--force is required when --to is omitted' })
  }
})
```

## Do

- Put per-field validation in `validators/rules/` rule functions.
- Put cross-field validation as a `.superRefine()` chain inside `validators/cli/<command>.ts`.
- Use the string literal `'custom'` for `code` instead of `z.ZodIssueCode.custom`.

## Don't

- Don't import `zod` / `z` directly inside `validators/cli/` files.
- Don't place cross-field checks in command handlers (`cli/commands/`).

---

**Keywords:** zod, superRefine, cross-field validation, validators/cli, z import, ZodEffects, addIssue, custom code
