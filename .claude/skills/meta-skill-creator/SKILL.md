---
name: meta-skill-creator
description: Create or review a SKILL.md file. Use when writing a new skill, auditing an existing one, or unsure how to structure skill content.
paths:
  - '.claude/skills/**'
disable-model-invocation: false
---

Write all skill content in **English**, regardless of the project's primary language.

## Naming

Skills live at `.claude/skills/<skill-name>/SKILL.md` — always one level deep, no nesting.

Choose a name with a **namespace prefix**:

| Prefix | Use for |
|:---|:---|
| `meta-*` | Skills about managing skills/agents/config |
| `arch-*` | Architecture and design pattern references |
| `db-*` | Database schema, query, migration knowledge |
| `ci-*` | CI/CD and deployment workflows |
| `(no prefix)` | Broad, project-wide skills (`commit`, `review`, `deploy`) |

Good: `meta-skill-creator`, `arch-session-flow`, `db-migrations`  
Bad: `helper`, `stuff`, `myskill`, `utils`

## Frontmatter fields

| Field | Notes |
|:---|:---|
| `name` | Lowercase, hyphens only, max 64 chars. Omit to use directory name. |
| `description` | **Most critical field.** Front-load the trigger phrase. Hard-truncated at 250 chars — put the essential signal in the first ~150 chars. |
| `paths` | Gitignore-style globs. Limits auto-activation to matching files. |
| `disable-model-invocation` | `true` prevents Claude from triggering the skill automatically — use for deployments, commits, or any action the user should invoke explicitly with `/skill-name`. `false` (default) for reference and knowledge skills with no side effects. |
| `user-invocable` | Omit (default) to allow users to call the skill with `/skill-name`. Set `false` for background knowledge that Claude loads silently — e.g. a `legacy-system-context` skill explaining how an old system works. Running `/legacy-system-context` isn't a meaningful action for users, so hide it. |
| `allowed-tools` | Tools pre-approved while skill is active. Space-separated: `Bash(git *) Read`. |

## Content guidelines

- Start with instructions immediately — no "Goal" or "Purpose" section (that belongs in `description`)
- Target **50–100 lines** for `SKILL.md`; move large reference material to supporting files
- Use numbered lists for sequential steps, bullets for options or facts
- Write what Claude should **do**, not what the skill **is**
- Write **How**, never **What** — the same skill should work for implement, test, or review without locking in the task

## Supporting files

Skills can ship additional files alongside `SKILL.md`:

```
my-skill/
├── SKILL.md          # Main instructions (required)
├── template.md       # Boilerplate for Claude to copy
├── examples/
│   └── sample.md     # Complete working example — more useful than inline Good/Bad
└── scripts/
    └── validate.sh   # Script Claude runs after completing the task
```

This skill's own supporting files:
- `template.md` — copy this when creating a new skill
- `examples/arch-example.md` — complete, well-structured skill to reference
- `scripts/validate.sh` — run after writing or editing any `SKILL.md`

## Creating a new skill

1. Copy `template.md` to `.claude/skills/<your-skill-name>/SKILL.md`
2. Fill in frontmatter and instructions; consult `examples/arch-example.md` for reference
3. Add `template.md`, `examples/`, or `scripts/` as needed
4. Validate: `bash .claude/skills/meta-skill-creator/scripts/validate.sh .claude/skills/<your-skill-name>/SKILL.md`
