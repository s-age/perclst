# validators/rules/*.ts Can Only Import zod

**Type:** Discovery

## Context

Files under `validators/rules/` are subject to an architecture constraint that limits
their import surface. This applies when adding constants or shared utilities that
rules files need.

## What happened / What is true

- By arch constraint, files in `validators/rules/*.ts` may only import from `zod`.
- Shared constants from `utils/` are not accessible inside `rules/` files.
- As a result, constants like `PIPELINE_EXTENSIONS` in `pipelinePath.ts` must be
  kept as file-local constants rather than imported from a shared location.
- When adding a new supported format, three places must be kept in sync:
  1. `utils/path.ts` — `extname` usage
  2. `pipelinePath.ts` — file-local extension constants
  3. `fileMoveRepository.ts` — format dispatch branching
- The CLI validator guards the entry point, so sync drift rarely causes runtime
  failures, but the three sites still need manual attention.

## Do

- Keep constants that rules files need as file-local definitions inside the rules file.
- When adding a new format, update all three sync points listed above.

## Don't

- Don't import from `utils/` or any module other than `zod` inside `validators/rules/*.ts`.
- Don't rely on the CLI guard alone — keep the three format sites in sync explicitly.

---

**Keywords:** validators, rules, zod-only, import constraint, arch violation, PIPELINE_EXTENSIONS, file-local constant, format sync
