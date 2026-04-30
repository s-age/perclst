# Pipeline pattern analysis: 7 canonical patterns

## Patterns

Seven pipeline patterns, each with a corresponding `done/` directory:

| Pattern | `done/` path | Structure | Key distinction |
|---------|-------------|-----------|-----------------|
| `implement-feature` | `implement/feature/` | pipeline(implement→review→test) → commit per layer | implementer has no procedure; detailed task from plan |
| `implement-unit-test` | `implement/unit-test/` | pipeline(implement→review→test) → commit | procedures: `test-unit/implement` + `test-unit/review` |
| `implement-integration-test` | `implement/integration-test/` | pipeline(implement→review→test) → commit | procedures: `test-integration/implement` + `arch/review` |
| `review-fix` | `review-fix/<layer>/` | initial-review → pipeline(fix→re-review→test) → commit | initial review runs OUTSIDE the fix loop |
| `lint-fix` | `lint-fix/<rule>/<target>` | pipeline(implement→test) → commit | no review agent; `lint-fix/all.json` is the parent orchestrator |
| `optimize-skills` | `optimize/skills/` | pipeline(implement→review→custom-gate) → commit per skill | domain-specific procedures; script gate is validate.sh not npm build |
| `optimize-knowledge` | `optimize/knowledge/` | parallel agents per domain → generic commit | no reviewer; no nested pipeline; commit agent does NOT resume an implementer |

## done/ taxonomy decisions

Edge cases and how they were classified:
- `arch-react-hooks/` → `review-fix/react-hooks/` (architecture violations in React hooks)
- `review-feature-abort/` → `review-fix/feature-abort/` (reviewing abort feature per layer; `<layer>/review.json` → `<layer>.json`)
- `review-scroll-feature.json` → `review-fix/react-hooks/scroll-feature.json`
- `refactor/infra/ts-parser.json` → `review-fix/infrastructures/ts-parser.json`
- `lint-fix.json` (parent orchestrator) → `lint-fix/all.json`
- `unit-test/` → `implement/unit-test/`
- `implement/cli-e2e-infra-di.yaml` → `implement/integration-test/` (creates e2e test helpers)

Items with no pattern fit — kept in place: `improve/`, `knowledge/`, `sample/`, `test/`

## Design: done/ uses / subdirectories, pipelines/ root uses __ separators

`pipelines/done/` intentionally uses `/` directory structure — `__` separators are replaced with `/` when archiving:

```
active:  pipelines/review-fix__cli__commands-analyze.yaml
done:    pipelines/done/review-fix/cli/commands-analyze.json
```

`validate-name.sh` only applies to `pipelines/` root files. Files under `done/` are not validated by the script and follow the subdirectory convention by design.

## Gotcha: done/ file naming must still be kebab-case

Directory names and filenames inside `done/` follow the same kebab-case rule (`-` word separator, no camelCase, no run-together words). Historical violations found and corrected:
- `infra/` → `infrastructures/` (align with unit-test layer name)
- `agentrepository.json` → `agent-repository.json` (and similar in repositories/)
- `claudecode.json` → `claude-code.json` (and similar in infrastructures/)
- Parsers: `tsparser.json` → `ts-parser.json`, etc.

## Gotcha: real pipelines in done/ violate current SKILL.md rules

Several `done/` pipelines break two rules:
1. **Commit inside the nested pipeline** — should be outside
2. **Reviewer names split** (`initial-reviewer` / `loop-reviewer`) — should share the same name for session resume

The example files in `examples/` follow SKILL.md rules. Do not use `done/` pipelines as structural templates.
