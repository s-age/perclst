---
name: meta-pipeline-creator
description: Author a new pipeline JSON file in pipelines/. Use when asked to create a pipeline, convert a manual workflow into an automated run, or add tasks to an existing pipeline.
paths:
  - pipelines/**
disable-model-invocation: true
---

Write all pipeline content in **English**, regardless of the project's primary language.

## Reading before writing

Before drafting a pipeline:

1. Read `src/types/pipeline.ts` — authoritative schema for all task fields.
2. Read an existing pipeline in `pipelines/` — use it as a structural reference.
3. If tasks will use a procedure, read `procedures/<name>.md` to understand what inputs the agent needs and which tools it calls internally.

## Naming tasks

Task `name` doubles as the resume key — a second pipeline run resumes the named session instead of starting fresh. Choose names that are:

- Scoped: `<pipeline-stem>-<target>` (e.g. `unit-test-domains-analyze`)
- Stable: don't encode dates or run numbers
- Unique across all pipelines in the repo

Omit `name` only when the task must always start fresh (stateless or one-shot).

## Choosing allowed_tools

Start from the minimum set the agent needs, then add:

1. Standard tools the procedure reads/writes with: `Read`, `Write`, `Bash`
2. **MCP tools the procedure calls** — list each by full name `mcp__<server>__<tool>`.
   Without this, the run stalls on a permission prompt mid-automation.
   Check the procedure's flowchart for tool names (e.g. `ts_test_strategist` → `mcp__perclst__ts_test_strategist`).

## Assigning procedures

- Set `procedure` on agent tasks when the task description would otherwise duplicate the procedure's flowchart logic.
- Keep `task` minimal when a procedure is set — pass only what the procedure needs as input (e.g. `target_file_path: src/foo.ts`).
- `procedure` is applied on session **start** only; it is ignored on resume.

## Script tasks and rejection loops

Add a `script` task after agent tasks when external validation (e.g. `npm run test:unit`) should gate progress:

- Set `rejected.to` to the agent task name that should fix the failure.
- Set `rejected.max_retries` (default 1); 2–3 is usually enough before aborting.
- The named agent task must appear **before** the script task in the array.

## Verification checklist

Before writing the file:

- [ ] Every MCP tool called by a procedure is listed in `allowed_tools`
- [ ] `rejected.to` references an existing `name` in the same `tasks` array
- [ ] Task names are unique and follow `<stem>-<target>` convention
- [ ] `task` text is minimal when a `procedure` is set
