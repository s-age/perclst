# Pipeline Filename to Kebab-Case Segment Conversion

**Type:** Discovery

## Context

When generating pipelines whose names or task names are derived from source filenames (e.g., `review-fix__cli__*` pipelines), the filename must be converted to kebab-case for use in pipeline name segments, task names, and `.claude/tmp/` paths.

## What happened / What is true

SKILL.md states "use lowercase and hyphens within segments" but does not explain how to convert camelCase filenames. The rule is:

- Split the filename stem on every uppercase letter boundary
- Lowercase all characters
- Join parts with `-`

Examples:

| Filename | Kebab segment |
|---|---|
| `usePermission.ts` | `use-permission` |
| `usePipelineRun.ts` | `use-pipeline-run` |
| `PipelineRunner.tsx` | `pipeline-runner` |
| `WorkflowPanel.tsx` | `workflow-panel` |
| `OutputPanel.tsx` | `output-panel` |

The same conversion applies consistently to:
- Pipeline name segments
- Task names within the pipeline
- `.claude/tmp/` path components

## Do

- Convert camelCase (and PascalCase) filenames by splitting on capital letter boundaries, lowercasing, and joining with `-`
- Apply this conversion uniformly to pipeline names, task names, and tmp paths

## Don't

- Don't use the raw camelCase filename directly in any pipeline name segment or task name
- Don't invent ad-hoc abbreviations; always derive the kebab form mechanically from the filename

---

**Keywords:** pipeline, naming, kebab-case, camelCase, PascalCase, filename, segment, task name, review-fix
