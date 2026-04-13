# Skill Authoring — Extended Notes

Things deliberately omitted from `meta-skill-creator` to keep it under 100 lines.
Pull from here when expanding that skill or creating related meta-skills.

---

## Lifecycle details worth knowing

### Description budget and `disable-model-invocation`
- All skill descriptions are loaded into context so Claude knows what's available — **even before any skill is invoked**
- The budget scales at **1% of context window**, fallback 8,000 chars; each entry capped at 250 chars regardless
- `SLASH_COMMAND_TOOL_CHAR_BUDGET` env var raises the cap
- `disable-model-invocation: true` removes the skill from Claude's context **entirely** — description is not loaded, no token cost, Claude cannot auto-invoke it

### After compaction
- When the conversation is summarized, Claude Code re-attaches the **most recent invocation** of each skill (first 5,000 tokens)
- Shared budget across all re-attached skills: **25,000 tokens**, filled from most-recently-invoked first — older skills may be dropped entirely
- If a skill stops influencing behavior mid-session, re-invoke it manually after compaction

### `sentSkillNames` deduplication
- Within a session, Claude is notified of each skill **at most once**
- The notification message (attachment) can be evicted by compaction, but the skill remains registered in `dynamicSkills` Map and stays callable

---

## Patterns not covered in meta-skill-creator

### Dynamic context injection (shell preprocessing)
Backtick syntax runs before Claude sees the content:

```
Pull request diff: !`gh pr diff`
Changed files: !`gh pr diff --name-only`
```

Multi-line variant:

    ```!
    node --version
    git status --short
    ```

This is **preprocessing**, not something Claude executes. Claude sees the rendered output only.
Can be disabled org-wide with `"disableSkillShellExecution": true` in managed settings.

### Supporting files pattern
Large reference material should live outside `SKILL.md`:

```
my-skill/
├── SKILL.md          # ~50–100 lines, references below files
├── reference.md      # detailed API docs
└── examples.md       # sample outputs
```

Explicitly reference them so Claude knows to load on demand:

```markdown
For complete field reference, see [reference.md](reference.md).
```

### Subagent execution (`context: fork`)
`SKILL.md` content becomes the task prompt for a forked agent.
Use `agent: Explore` for read-only research, `agent: Plan` for design work.
Without explicit instructions the subagent gets guidelines but no actionable task — returns nothing useful.

### `$ARGUMENTS` behavior
If `$ARGUMENTS` placeholder is absent from content, args are appended as `ARGUMENTS: <value>` at the end.
Positional access: `$ARGUMENTS[0]` / `$0`, `$ARGUMENTS[1]` / `$1`.
Multi-word values need quoting: `/my-skill "hello world" second`.

### `paths` only affects auto-activation
Manual `/skill-name` invocation always works regardless of `paths`. Paths only gate
whether Claude auto-loads the skill when you're working on matching files.

### Nested discovery (monorepo)
When editing `packages/frontend/src/foo.ts`, Claude Code also looks for skills in
`packages/frontend/.claude/skills/`. Useful for package-local skills in a monorepo.

---

## Namespace ideas for this project

Beyond what's in meta-skill-creator's table:

| Prefix | Candidate skills |
|:---|:---|
| `mcp-*` | MCP tool authoring, server registration patterns |
| `session-*` | Session file format, turn structure, manager API |
| `proc-*` | Procedure authoring (system prompt conventions) |
| `cli-*` | CLI command patterns, display layer, Commander.js wiring |

---

*Draft — last updated 2026-04-14*
