# meta-librarian Template Lives in the Skill Directory

**Type:** Discovery

## Context

When running the meta-librarian to promote draft knowledge entries, the SKILL.md instructs
"Use `template.md` as the base for every promoted file." It is not obvious where that file lives.

## What is true

`template.md` lives in the skill directory: `.claude/skills/meta-librarian/template.md`.
It is **not** at `knowledge/template.md`. The SKILL.md reference is relative to the skill's
own directory.

The canonical format it defines:

```
# <Title>

**Type:** Discovery | Problem | External

## Context
<when/where this applies>

## What happened / What is true
<facts or narrative>

## Do
- ...

## Don't
- ...

---

**Keywords:** comma-separated search terms
```

## Do

- Read `.claude/skills/meta-librarian/template.md` when you need the exact format for promoted files
- Fall back to inferring the format from existing files under `knowledge/` if the template is inaccessible

## Don't

- Look for the template at `knowledge/template.md` — it does not live there
- Invent an alternate format; use only the structure defined in the template

---

**Keywords:** meta-librarian, template.md, knowledge promotion, skill directory, file format
