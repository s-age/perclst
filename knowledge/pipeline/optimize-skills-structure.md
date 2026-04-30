# optimize-skills Is Structurally Identical to implement-feature

**Type:** Discovery

## Context

`optimize-skills` looks like a distinct pipeline pattern but shares the exact same
nested pipeline structure as `implement-feature`. Only the procedures and script gate
differ. No separate structural example is needed.

## What is true

Both patterns follow: cleanup → pipeline(implement → review → script gate) → commit outside.

Differences in `optimize-skills` vs `implement-feature`:

| Aspect | `implement-feature` | `optimize-skills` |
|---|---|---|
| Implementer procedure | _(none — detailed task)_ | domain-specific (e.g., `improve-arch-skill`) |
| Reviewer procedure | `arch/review` | domain-specific (e.g., `review-arch-skill`) |
| Script gate | `npm run build && npm run test:unit` | custom `validate.sh` for the skill domain |

## Do

- Base new `optimize-skills` pipelines on `implement__feature-name.yaml` from `examples/`
- Substitute the domain-specific procedures and the custom `validate.sh` gate command

## Don't

- Don't create a new structural example for `optimize-skills` — it has no unique structure
- Don't use `npm run build && npm run test:unit` as the gate command for skills;
  use the domain's `validate.sh`

---

**Keywords:** optimize-skills, implement-feature, pipeline structure, script gate, validate.sh, domain procedures, structural template, nested pipeline
