---
name: meta-skill-creator
description: Create or review a SKILL.md file. Use when writing a new skill, auditing an existing one, or unsure how to structure skill content.
paths:
  - .claude/skills/**
disable-model-invocation: true
---

Write all skill content in **English**, regardless of the project's primary language.

## Naming

Skills live at `.claude/skills/<skill-name>/SKILL.md` — always one level deep, no nesting.

Choose a name with a **namespace prefix** to prevent chaos as the skill library grows:

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
| `description` | **Most critical field.** Claude uses this to decide when to auto-load the skill. Front-load the trigger phrase. Hard-truncated at 250 chars in listings — put the essential signal in the first ~150 chars. |
| `paths` | Gitignore-style globs. `/**` suffix is stripped automatically by the `ignore` library. Limits auto-activation to files matching the patterns. |
| `disable-model-invocation` | `true` for side-effecting or user-controlled workflows (deploy, commit, send). `false` (default) for reference/knowledge skills. |
| `user-invocable` | `false` for background context Claude loads silently; omit otherwise. |
| `allowed-tools` | Tools pre-approved while skill is active. Space-separated: `Bash(git *) Read`. |

## Content guidelines

- Start with instructions immediately — no "Goal" or "Purpose" section (that belongs in `description`)
- Target **50–100 lines** for `SKILL.md`; move large reference material to supporting files
- Use numbered lists for sequential steps, bullets for options or facts
- Write what Claude should **do**, not what the skill **is**
- Write **How**, never **What** — a skill captures the approach (how to review, how to format, how to structure), not the task itself (what to review, what to write). The same layer can be used for implement, test, or review; locking in the "what" makes the skill rigid and non-reusable.

## Good vs Bad

**description**

```
# Good — trigger phrase front-loaded, fits 150 chars
Explains code with diagrams and analogies. Use when explaining how code works or when asked "how does this work?"

# Bad — vague, no trigger signal
Helper skill for developers working with code.
```

**content opening**

```
# Good — starts with action
When explaining code, always include:
1. An analogy comparing it to everyday life
2. An ASCII diagram of the flow

# Bad — wastes tokens on meta-explanation
## Goal
This skill helps you write better code by providing a structured explanation framework...
```

**How vs What**

```
# Good — captures How; works for implement, test, or review
When writing TypeScript, always:
1. Prefer explicit return types on public functions
2. Use `unknown` over `any` at system boundaries

# Bad — locks in What; can only ever be used to implement one thing
Implement the session manager by creating a SessionManager class
with create(), get(), and delete() methods.
```

**paths**

```yaml
# Good — scoped to a source subtree
paths:
  - src/lib/agent/**

# Bad — too broad, skill fires on unrelated files
paths:
  - src/**
```

## Template

~~~markdown
---
name: your-skill-name
description: One sentence on what it does. Use when [trigger phrase / user says X].
paths:
  - src/your-area/**
disable-model-invocation: false
---

[Start with instructions immediately — no preamble]

1. **Step one**: ...
2. **Step two**: ...

## Notes

- ...
~~~
