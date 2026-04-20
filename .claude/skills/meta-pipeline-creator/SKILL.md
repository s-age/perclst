---
name: meta-pipeline-creator
description: Author a new pipeline JSON file in pipelines/. Use when asked to create a pipeline, convert a manual workflow into an automated run, or add tasks to an existing pipeline.
paths:
  - 'pipelines/**'
disable-model-invocation: true
---

Write all pipeline content in **English**, regardless of the project's primary language.

## Reading before writing

Before drafting a pipeline:

1. Read `src/types/pipeline.ts` — authoritative schema for all task fields.
2. Read an existing pipeline in `pipelines/` — use it as a structural reference.
3. If tasks will use a procedure, read `procedures/<name>.md` to understand what inputs the agent needs and which tools it calls internally.

## Naming pipeline files

**MANDATORY**: New pipeline files MUST be placed in the `pipelines/` root directory. NEVER create new pipeline files inside `pipelines/done/` — that directory is reserved exclusively for pipelines that have already been run and archived.

Pipeline filenames use `__` (double-underscore) as the namespace separator and `-` as the word separator within a segment:

```
<namespace>__<namespace>__<name>.json
unit-test__infrastructures__commandrunner-projectroot.json
```

- Each `__`-separated segment becomes a directory level when the file is moved to `done/`
- Use lowercase and hyphens within segments; no underscores, no camelCase
- Always place the new file at `pipelines/<namespace>__<namespace>__<name>.json`, never in a subdirectory

## Naming tasks

Task `name` doubles as the resume key — a second pipeline run resumes the named session instead of starting fresh. Choose names that are:

- Scoped: `<pipeline-stem>-<target>` (e.g. `unit-test-domains-analyze`)
- Stable: don't encode dates or run numbers
- Unique across all pipelines in the repo

Omit `name` only when the task must always start fresh (stateless or one-shot).

## Choosing allowed_tools

Start from the minimum set the agent needs, then add:

1. Standard tools the procedure reads/writes with: `Read`, `Write`, `Edit`, `Bash`
2. **MCP tools the procedure calls** — list each by full name `mcp__<server>__<tool>`.
   Without this, the run stalls on a permission prompt mid-automation.
   Check the procedure's flowchart for tool names (e.g. `ts_test_strategist` → `mcp__perclst__ts_test_strategist`).

## Assigning procedures

- Set `procedure` on agent tasks when the task description would otherwise duplicate the procedure's flowchart logic.
- Keep `task` minimal when a procedure is set — pass only what the procedure needs as input (e.g. `target_file_path: src/foo.ts`).
- `procedure` is applied on session **start** only; it is ignored on resume.

## Nested pipeline tasks

Use `type: "pipeline"` to group a sequence of tasks under a single named unit:

```json
{
  "type": "pipeline",
  "name": "unit-test-foo-service",
  "tasks": [...]
}
```

`name` is required — it doubles as the `rejected.to` target for outer script tasks.

**When to use a nested pipeline:**

- An outer `script` rejection needs to re-run a multi-agent sequence (implement → review → commit), not just a single agent.
- Multiple independent targets (e.g. one service file each) should each get their own named pipeline so failures are isolated and `rejected.to` is unambiguous.

**Multiple independent targets** — place each as a sibling `pipeline` task at the top level:

```json
{
  "tasks": [
    { "type": "pipeline", "name": "unit-test-foo-service", "tasks": [...] },
    { "type": "pipeline", "name": "unit-test-bar-service", "tasks": [...] }
  ]
}
```

## Agent-level rejection via `ng_output_path`

When a review agent should reject the preceding implement agent (within a nested pipeline), use the `ng_output_path` pattern:

- Pass `ng_output_path: .claude/tmp/<review-agent-name>` in the review agent's `task` field.
- The review agent writes rejection feedback to that file; perclst loops back to the implement agent with the file contents as feedback.
- Set `rejected` on the review agent task (not the script task) pointing to the implement agent.

```json
{
  "type": "agent",
  "name": "review-unit-test-foo-service",
  "task": "target_file_path: src/services/fooService.ts\nng_output_path: .claude/tmp/review-unit-test-foo-service",
  "procedure": "review-unit-test",
  "rejected": {
    "to": "implement-unit-test-foo-service",
    "max_retries": 3
  }
}
```

### Cleaning up stale `ng_output_path` files

If a pipeline is re-run after a previous run that wrote to `ng_output_path`, the stale file will cause downstream agents to skip the "no issues" early-exit and proceed as if issues were found. To prevent this, add a `script` task at the top of the outer `tasks` array to delete the file before the review agent runs:

```json
{
  "type": "script",
  "command": "rm -f .claude/tmp/<ng-output-path-name>"
}
```

This must be the **first** task in the outer array — before the initial review agent.

## Script tasks and rejection loops

Add a `script` task after agent tasks when external validation (e.g. `npm run test:unit`) should gate progress:

- Set `rejected.to` to the **agent or pipeline** task name that should fix the failure.
- Set `rejected.max_retries` (default 1); 2–3 is usually enough before aborting.
- The named task must appear **before** the script task in the array.

## Quality check gates

Place a `script` gate immediately after each agent task (or nested pipeline) that produces testable output. Use `npm run test:unit` — not `npm run test` — as the validation command.

```json
{
  "type": "script",
  "command": "npm run test:unit",
  "rejected": {
    "to": "<preceding-agent-or-pipeline-name>",
    "max_retries": 3
  }
}
```

When a pipeline has multiple independent agent tasks (e.g. one per file), give each its own gate so a failure is caught and fixed before the next agent starts.

## Running a pipeline

After writing the file, run it with:

```bash
perclst run pipelines/<name>.json
```

## Verification checklist

Before writing the file:

- [ ] File is placed at `pipelines/<name>.json` — NOT inside `pipelines/done/` or any subdirectory
- [ ] Filename uses `__` (double-underscore) as namespace separator, `-` within segments, all lowercase
- [ ] Every MCP tool called by a procedure is listed in `allowed_tools`
- [ ] `rejected.to` references an existing `name` (agent or pipeline) visible in the same `tasks` array scope
- [ ] Task names are unique and follow `<stem>-<target>` convention
- [ ] `task` text is minimal when a `procedure` is set
- [ ] Each agent task that produces testable output is followed by a `npm run test:unit` gate
- [ ] Review agents that use `ng_output_path` have `rejected` set pointing to the implement agent
- [ ] Nested pipeline `name` is set (required for `rejected.to` targeting)
