# Zod v4: `z.coerce.number()` Returns `ZodCoercedNumber`, Not `ZodNumber`

**Type:** External

## Context

Applies when upgrading from Zod v3 to v4 and annotating explicit return types on functions
that use `z.coerce.number()`. Also affects any code using `ReturnType<typeof z.string>` as a
shorthand for `z.ZodString` — that shortcut silently breaks in v4.

## What happened / What is true

**`z.coerce.number()` return type changed**

In Zod v4, `z.coerce.number()` returns `ZodCoercedNumber` (which extends `_ZodNumber`) rather
than `ZodNumber`. An explicit return type annotation of `z.ZodNumber` on a function that
returns `z.coerce.number().int()` produces a type error.

Use a nested `ReturnType` instead:

```ts
// v4 — coerce.number().int() returns a ZodCoercedNumber variant
type IntSchema = ReturnType<ReturnType<typeof z.coerce.number>['int']>
export function intRule(): IntSchema { return z.coerce.number().int() }
```

Non-coerce schemas continue to work with their concrete types:

```ts
export function booleanRule(): z.ZodBoolean { return z.boolean() }
export function stringRule(): z.ZodString  { return z.string() }
```

**`ReturnType<typeof z.string>` resolves to the base type**

`z.string` has generic overloads; `ReturnType<typeof z.string>` resolves to
`$ZodType<string, string, ...>` — a broad base type that lacks `.optional()`, `.min()`,
and other chained methods. Prefer the concrete named type:

```ts
// Good — concrete type with full method set
export function stringRule(): z.ZodString { return z.string() }

// Bad — resolves to base type, breaks method chaining at call sites
export function stringRule(): ReturnType<typeof z.string> { return z.string() }
```

## Do

- Annotate non-coerce schemas with their concrete Zod types (`z.ZodString`, `z.ZodBoolean`, …)
- For coerce schemas, derive the return type via `ReturnType<ReturnType<typeof z.coerce.number>['int']>`

## Don't

- Annotate `z.coerce.number()` return values as `z.ZodNumber` — the types differ in v4
- Use `ReturnType<typeof z.string>` as an annotation shortcut — it strips chained methods

---

**Keywords:** Zod v4, coerce, ZodCoercedNumber, ZodNumber, ReturnType, type annotation, z.string, ZodBoolean, upgrade, breaking change
