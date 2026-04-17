# Edit Must Be Listed Separately in `allowed_tools`

**Type:** Problem

## Context

Applies whenever configuring `allowed_tools` for a sub-agent — in `pipelines/*.json` task
definitions, skill `SKILL.md` files, or any `perclst start --allowed-tools` invocation where
the agent is expected to modify existing files.

## What happened / What is true

`Edit` and `Write` are distinct tools in Claude Code:

- `Write` — creates new files (or fully overwrites them)
- `Edit` — modifies existing files in place

Listing only `"Write"` in `allowed_tools` causes the agent to stall on a permission prompt
the moment it tries to edit an existing file, because `Edit` is not covered by the `Write`
permission.

## Do

- Include **both** `"Edit"` and `"Write"` in `allowed_tools` whenever the agent may touch files
- When adding file-writing permissions, default to `["Read", "Edit", "Write"]` as the minimal
  set for an agent that reads and modifies files
- Apply this to all config locations: pipeline task `allowed_tools`, skill arrays, CLI flags

## Don't

- Don't assume `Write` covers editing existing files — it does not
- Don't rely on the agent self-correcting; it will stall waiting for user approval

---

**Keywords:** allowed_tools, Edit, Write, permission prompt, pipeline, skill, agent config, stall
