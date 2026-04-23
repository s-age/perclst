# Zod Object: Unknown Fields Are Stripped by Default

**Type:** External

## Context

When using Zod to validate objects — especially in MCP tool schema definitions — it is easy to assume that `z.object()` rejects unknown fields by default, as some other validation libraries do. This assumption leads to incorrect tests and unexpected runtime behavior.

## What happened / What is true

- `z.object()` **strips** unknown fields by default — validation succeeds and the extra keys are omitted from the result.
- `.strict()` makes Zod **reject** objects that contain unknown keys with a validation error.
- `.passthrough()` makes Zod **pass through** unknown fields unchanged.
- `.strip()` is the explicit equivalent of the default — strips unknown fields.

| Modifier | Unknown fields |
|----------|----------------|
| _(default)_ | stripped silently |
| `.strip()` | stripped (explicit) |
| `.strict()` | rejected (error) |
| `.passthrough()` | preserved |

MCP schemas may receive additional fields injected by SDK processing. The default strip behavior means the schema degrades gracefully rather than rejecting valid input with extra keys.

## Do

- Test the actual Zod behavior for your schema mode — do not assume a mode.
- Use `.strict()` explicitly when you want to reject unknown fields.
- When writing tests for MCP schemas, verify that extra SDK-injected fields do not cause failures.

## Don't

- Assume `z.object()` rejects unknown fields — it does not.
- Rely on implicit stripping as a security boundary; use `.strict()` when strictness is required.

---

**Keywords:** zod, schema, validation, unknown fields, strip, strict, passthrough, MCP, z.object
