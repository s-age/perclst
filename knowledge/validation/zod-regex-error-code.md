# Zod regex validation error code

**Type:** External

## Context

When writing unit tests for Zod validators that use `.regex()`, you need to know the correct error code to check. This is critical for assertion accuracy in tests validating invalid inputs.

## What happened / What is true

When a Zod `.regex()` validation fails, the error code returned in `.safeParse()` is `'invalid_format'`, not `'invalid'`. This differs from other validation failures:

- `.regex()` failures → `'invalid_format'`
- `.min()` / `.max()` failures → `'too_small'` / `'too_big'`
- `.string()` type failures → `'invalid_type'`

Example:
```ts
const schema = z.string().regex(/^[a-z]+$/)
const result = schema.safeParse('ABC123')

if (!result.success) {
  result.error.issues[0].code // 'invalid_format'
}
```

## Do

- Check for `'invalid_format'` when asserting on regex validation failures in tests
- Consult Zod error codes documentation when testing unfamiliar validators

## Don't

- Assume regex errors use the code `'invalid'` (they don't)
- Mix up error codes between different validation methods

---

**Keywords:** zod, validation, regex, error-code, invalid_format, safeParse
