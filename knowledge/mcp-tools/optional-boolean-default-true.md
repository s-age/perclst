# Optional Boolean Parameters That Default to True

**Type:** Discovery

## Context

When writing a function or MCP tool parameter typed as `recursive?: boolean` where the intended
default is `true` (i.e. absent means enabled), the check pattern matters for correctness and clarity.

## What happened / What is true

Three patterns exist for "absent means true":

| Pattern | Correct? | Notes |
|---|---|---|
| `args.recursive !== false` | ✅ | Explicit: absent (`undefined`) → true, `false` → false |
| `args.recursive ?? true` | ✅ | Works, but less idiomatic for boolean flags |
| `!!args.recursive` | ❌ | `undefined` coerces to `false`, breaking the default |

`!== false` is the clearest signal to a reader that "absent = on".

## Do

- Use `param !== false` when an optional boolean should default to `true`
- Treat this as the canonical pattern in MCP tool implementations

## Don't

- Don't use `!!param` for optional booleans with a true default — it treats `undefined` as `false`
- Don't use `param === true` — it also treats `undefined` as `false`

---

**Keywords:** optional boolean, default true, undefined coercion, !== false, MCP tool parameter, TypeScript
