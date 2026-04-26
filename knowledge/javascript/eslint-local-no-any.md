# Project Uses Custom `local/no-any` ESLint Rule, Not `@typescript-eslint/no-explicit-any`

**Type:** Discovery

## Context

Applies to all TypeScript files in this project. The standard `@typescript-eslint/no-explicit-any`
rule is disabled and replaced by a custom rule `local/no-any`. This affects how ESLint disable
comments must be written.

## What happened / What is true

The ESLint config turns off `@typescript-eslint/no-explicit-any` and activates `local/no-any`
instead. As a result:

- `// eslint-disable-next-line @typescript-eslint/no-explicit-any` has **no effect** — the
  rule it targets is disabled, so the comment is silently ignored
- `// eslint-disable-next-line local/no-any` is the correct form

This mismatch is easy to miss because the silenced-rule comment does not itself cause an error;
the `as any` expression just continues to be flagged.

## Do

- Use `// eslint-disable-next-line local/no-any` to suppress the rule on a specific line

## Don't

- Use `// eslint-disable-next-line @typescript-eslint/no-explicit-any` — it is silently
  ineffective because the underlying rule is off
- Rely on `as any` without the correct disable comment

---

**Keywords:** ESLint, local/no-any, @typescript-eslint/no-explicit-any, eslint-disable, any, custom rule, disable comment
