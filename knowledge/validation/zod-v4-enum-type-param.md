# Zod v4: ZodEnum Type Parameter Changed from Array to Object

**Type:** External

## Context

Code that explicitly annotates `z.ZodEnum<...>` type parameters (e.g., as a function
return type) will silently produce broken types when upgraded from Zod v3 to v4.
The runtime is unaffected; only type-checking breaks.

## What happened / What is true

In **Zod v3**, `ZodEnum<T>` accepted a readonly tuple as its type parameter:
```ts
z.ZodEnum<['text', 'json']>  // v3: OK
```

In **Zod v4**, `ZodEnum<T>` requires `T extends EnumLike` where
`EnumLike = Readonly<Record<string, string | number>>`. The correct annotation is an
object type mapping each value to itself:
```ts
z.ZodEnum<{ text: 'text'; json: 'json' }>  // v4: correct
```

Using the old array annotation **compiles without error** but produces a broken `_output`
type: `T[keyof T]` on an array resolves to all array methods/properties (`length`, `push`,
`values()`, …) plus the string values — the resulting union is not assignable to
`'text' | 'json' | undefined`.

`z.enum(['text', 'json'] as const)` infers `ZodEnum<{ text: 'text'; json: 'json' }>`
automatically; explicit annotations must use the object form.

Affected file in this repo: `src/validators/rules/format.ts` (fixed in commit 2da614e).

## Do

- Write explicit `ZodEnum` type params as object types:
  ```ts
  z.ZodDefault<z.ZodEnum<{ text: 'text'; json: 'json' }>>
  ```
- Prefer inference (`z.enum([...] as const)`) to avoid maintaining explicit annotations.

## Don't

- Don't carry over `ZodEnum<['a', 'b']>` array annotations from v3 — they compile but
  silently widen the output type to include all array prototype members.

---

**Keywords:** Zod v4, ZodEnum, EnumLike, type parameter, array tuple, object type, _output, type inference, upgrade, format.ts
