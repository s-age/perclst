# Seven Canonical Pipeline Patterns

**Type:** Discovery

## Context

Every pipeline created by the pipeline-creator skill maps to one of seven canonical
patterns. Each pattern has a fixed structural shape, a corresponding `done/`
subdirectory, and key constraints on procedures and agent roles.

## What is true

| Pattern | `done/` path | Structure | Key distinction |
|---|---|---|---|
| `implement-feature` | `implement/feature/` | pipeline(implement→review→test) → commit per layer | Implementer has no procedure; detailed task from plan |
| `implement-unit-test` | `implement/unit-test/` | pipeline(implement→review→test) → commit | Procedures: `test-unit/implement` + `test-unit/review` |
| `implement-integration-test` | `implement/integration-test/` | pipeline(implement→review→test) → commit | Procedures: `test-integration/implement` + `arch/review` |
| `review-fix` | `review-fix/<layer>/` | initial-review → pipeline(fix→re-review→test) → commit | Initial review runs **outside** the fix loop |
| `lint-fix` | `lint-fix/<rule>/<target>/` | pipeline(implement→test) → commit | No review agent; `lint-fix/all.json` is the parent orchestrator |
| `optimize-skills` | `optimize/skills/` | pipeline(implement→review→custom-gate) → commit per skill | Domain-specific procedures; `validate.sh` gate not `npm run build` |
| `optimize-knowledge` | `optimize/knowledge/` | parallel agents per domain → generic commit | No reviewer; no nested pipeline; commit agent does NOT resume an implementer |

Items with no pattern fit — `improve/`, `knowledge/`, `sample/`, `test/` — are
kept in place and are not canonical patterns.

## Do

- Match every new pipeline to one of these seven patterns before building it
- Use the pattern's `done/` path when archiving the completed pipeline file

## Don't

- Don't use `done/` pipelines as structural templates — several contain known
  SKILL.md violations (see `done-dir-legacy-violations.md`)

---

**Keywords:** pipeline patterns, canonical patterns, implement-feature, implement-unit-test, implement-integration-test, review-fix, lint-fix, optimize-skills, optimize-knowledge, done directory, pipeline-creator
