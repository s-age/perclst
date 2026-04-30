# done/ Directory Taxonomy and Edge-Case Classifications

**Type:** Discovery

## Context

When archiving completed pipelines to `pipelines/done/`, edge cases arise where
a pipeline name doesn't cleanly map to a canonical pattern directory. These
classifications were resolved explicitly during a done/ cleanup pass.

## What is true

**Edge-case archive destinations:**
- `arch-react-hooks/` → `review-fix/react-hooks/`
- `review-feature-abort/` → `review-fix/feature-abort/`
- `review-scroll-feature.json` → `review-fix/react-hooks/scroll-feature.json`
- `refactor/infra/ts-parser.json` → `review-fix/infrastructures/ts-parser.json`
- `lint-fix.json` (parent orchestrator) → `lint-fix/all.json`
- `unit-test/` → `implement/unit-test/`
- `implement/cli-e2e-infra-di.yaml` → `implement/integration-test/`

**Historical naming violations corrected during the cleanup:**
- `infra/` → `infrastructures/` (align with unit-test layer naming)
- `agentrepository.json` → `agent-repository.json`
- `claudecode.json` → `claude-code.json`
- `tsparser.json` → `ts-parser.json`

**Validation scope:**
`validate-name.sh` applies only to `pipelines/` root files. Files under `done/`
are not validated by the script and follow the subdirectory convention by design.

## Do

- Use `infrastructures/` (not `infra/`) as the layer directory name in `done/`
- Apply kebab-case to all directory names and filenames inside `done/`
- Use `/` subdirectory separators inside `done/` (the `__` root convention does
  not apply there)

## Don't

- Don't run `validate-name.sh` against `done/` files
- Don't use `infra/` as a shorthand layer name — it has been corrected to
  `infrastructures/` to align with test layer naming

---

**Keywords:** done directory, taxonomy, pipeline archiving, edge cases, naming corrections, infrastructures, kebab-case, validate-name.sh, cleanup
