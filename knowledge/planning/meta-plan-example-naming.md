# meta-plan Examples Are Named by Pattern, Not by Plan Slug

**Type:** Discovery

## Context

The `.claude/skills/meta-plan/examples/` directory holds example plans used by the
meta-plan agent when selecting a reference structure. When adding a new example, the
choice of directory name matters for how legible and reusable those examples are.

## What is true

Examples are named after the **pipeline pattern** they illustrate
(e.g., `implement-feature/`, `implement-integration-test/`), **not** after the
specific plan slug they were derived from (e.g., `chat-command/`, `cli-e2e-infra-di/`).

A plan-slug name gives no signal about which pattern the example demonstrates; a
pattern name is immediately legible to the meta-plan agent selecting the right example.
Only one example per pattern is needed — if two plans share the same pattern, keep the
one with the clearest layer structure.

## Do

- Name new example directories after the reusable pattern: `implement-feature/`,
  `implement-integration-test/`, etc.
- Keep only one example per pattern; prefer the one with the clearest layer boundaries.

## Don't

- Don't name examples after the source feature or plan slug (`chat-command/`,
  `cli-e2e-infra-di/`).
- Don't add duplicate examples for the same pattern just because a second plan used it.

---

**Keywords:** meta-plan, examples, naming convention, pattern, plan slug, planning skill
