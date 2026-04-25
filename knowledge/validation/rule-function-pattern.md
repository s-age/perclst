# Validators: Every Rule Must Be a Named Function

**Type:** Discovery

## Context

All exports from `src/validators/rules/` must be **named functions**, not const
exports. This is a strict layer convention enforced by architectural scanning.
It applies to every rule file — even when the rule is simple and used by only one
caller.

## What is true

The `rules/` sublayer contract is: one `xxxRule()` function per file, exported by
name. Raw schema constants must not be the module's primary export.

```ts
// ❌ WRONG — const export breaks architecture
export const pipelineSchema = z.object({ ... })

// ✅ RIGHT — function wraps the schema
export function pipelineSchemaRule(): typeof pipelineSchema {
  return pipelineSchema
}
```

When a rule accepts options (e.g. `required`), match the pattern of `stringRule`:

```ts
type StringArrayRuleOpts = { required?: boolean }
export function stringArrayRule(opts: StringArrayRuleOpts = {}): z.ZodArray<z.ZodString> {
  let s = z.array(z.string())
  if (opts.required) s = s.min(1)
  return s
}
```

## Do

- Export each rule as a named function: `export function xyzRule(...): ZodType`
- Accept an opts parameter (with defaults) whenever callers may pass options.
- Keep one rule function per file under `rules/`.

## Don't

- Don't export raw Zod schemas as the module's primary export from `rules/`.
- Don't accept no arguments if callers already pass an options object — add the
  parameter to match existing usage.

---

**Keywords:** validators, rules, named-function, const, architecture, pattern, zod, rule-builder
