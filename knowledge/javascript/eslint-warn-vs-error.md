# ESLint `warn` Does Not Enforce Rules — Use `error`

**Type:** Problem

## Context

Applies whenever configuring ESLint rules that should block CI or prevent merging. Using the wrong severity level causes violations to silently accumulate without any build failure.

## What happened / What is true

`max-lines-per-function` was set to `"warn"` in the ESLint config. Because warnings do not fail the lint step, violations accumulated across 4 locations while CI continued to pass. Developers rarely notice warnings in CI output; they effectively become noise.

- `"warn"` emits a warning but exits with code 0 — CI passes regardless
- `"error"` exits with code 1 — CI fails and the violation must be addressed
- Rule: if you want a lint rule to be enforced, it must be `"error"`

## Do

- Set any rule you actually want enforced to `"error"`
- Reserve `"warn"` only for advisory hints where violations are intentionally permitted (e.g., a rule under trial before enforcement)
- Audit existing `"warn"` rules periodically to decide: promote to `"error"` or remove entirely

## Don't

- Don't use `"warn"` as a softer version of `"error"` — it provides no enforcement
- Don't assume developers will act on warnings; they are routinely ignored in CI logs

---

**Keywords:** eslint, warn, error, severity, CI, lint, rule enforcement, max-lines-per-function, exit code
