# File Enumeration Tables in arch-* Skills Go Stale

**Type:** Problem

## Context

Applies when writing or auditing `arch-*` skills that include a `## Files` table listing individual source files by name (e.g., `arch-repositories`, `arch-validators`, `arch-services`, `arch-types`). These tables drift out of sync as the codebase grows, creating a documentation liability worse than no table at all.

## What happened / What is true

Multiple arch-* skills accumulated severe drift:
- `arch-repositories`: 13 table entries, 20+ actual files (missing `checkerRepository`, `gitRepository`, `fileMoveRepository`, `knowledgeSearchRepository`, `permissionPipeRepository`, `rejectionFeedback`, `shell`, `testStrategyRepository`)
- `arch-services`: 4 of 12 service files documented (missing `abortService`, `checkerService`, `knowledgeSearchService`, `permissionPipeService`, `pipelineFileService`, `pipelineService`, `tsAnalysisService`, `testStrategistService`)
- `arch-validators`: 20-row table, already missing 10+ CLI validators (`chatSession`, `forkSession`, `rewindSession`, etc.) and 1 rule (`gitRefRule`)
- `arch-types`: 7 of 14 type files missing; one listed type (`IClaudeCodeRepository`) never existed

Root cause: new files are added during feature work without updating the skill, and skills are not part of the PR diff review flow.

## Do

- Replace file enumeration with **sublayer convention tables** that describe patterns, not instances:
  ```
  | Sublayer   | Convention                                              |
  |------------|----------------------------------------------------------|
  | `rules/`   | One rule function per file: `stringRule`, `intRule`, … |
  ```
  Convention rows stay accurate as new files are added.
- Describe the directory structure with a tree block; direct readers to run `ls src/<layer>/` for the authoritative list.
- When a table must be kept (e.g., to show which exports each file provides), schedule periodic audits and note the last-verified date.

## Don't

- Don't enumerate individual source files by name in a SKILL.md table — the list diverges the moment a new file is added.
- Don't claim specific exports per file ("file X exports Y") without a link to the actual source.
- Don't treat an arch-* skill's Files table as the source of truth — the source files themselves are.

---

**Keywords:** file table, staleness, arch-skill, enumeration, sublayer convention, drift, repositories, validators, services, types, audit
