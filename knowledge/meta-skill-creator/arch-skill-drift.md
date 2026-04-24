# arch-* Skills Drift From Reality After Codebase Changes

**Type:** Problem

## Context

`arch-*` skills act as reference catalogs for their layer. They are written once at layer creation and are not automatically updated when the code changes. Applies to any skill in the `arch-*` namespace (`arch-errors`, `arch-mcp`, `arch-infrastructures`, `arch-domains`, etc.).

## What happened / What is true

Several classes of drift have been observed:

**Incomplete inventories**: `arch-errors` documented 6 of 9 error classes (missing `pipelineMaxRetriesError`, `rawExitError`, `pipelineAbortedError`). `arch-infrastructures` documented 3 of 11 adapters (missing `commandRunner`, `shell`, `git`, `fileMove`, `projectRoot`, `testFileDiscovery`, `ttyInfrastructure`, `knowledgeReader`).

**Stale pattern descriptions**: `arch-mcp` documented `ask_permission` as an inline function in `server.ts` with direct `/dev/tty` I/O. The actual code had already moved it to `tools/askPermission.ts` with service-based DI. The prohibition "Never move ask_permission to tools/askPermission.ts" was the exact opposite of reality.

**"Future" language that never expires**: `arch/SKILL.md` described `validators/mcp/` as "a future entry point — get their own subdirectory (e.g. `validators/mcp/`)" after that directory had already shipped with 8 files.

## Do

- Before merging or publishing any `arch-*` skill, run the layer's glob (`ls src/<layer>/`) and verify every file appears in the skill.
- After adding new files to a layer, update the corresponding `arch-*` skill in the same PR.
- After a significant refactor (service DI model change, layer split, new pattern adopted), audit all `arch-*` skills that describe the affected code.
- Remove "future", "planned", or "coming soon" language — replace it with the actual current state or a `TODO(date):` marker so it is findable.

## Don't

- Don't write prohibitions referencing specific filenames (e.g., "Never move X to Y") — the prohibition may outlive the refactor that made it obsolete.
- Don't treat an `arch-*` skill as complete once published; treat it as living documentation requiring the same maintenance as code comments.
- Don't rely on "I'll update the skill later" — the skill update belongs in the same change that modifies the layer.

---

**Keywords:** arch-skill, drift, staleness, inventory, completeness, future language, refactor, audit, ask_permission, validators/mcp, errors, infrastructures
