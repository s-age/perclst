# meta-librarian SKILL.md references template.md that doesn't exist

The meta-librarian SKILL.md says "Use `template.md` as the base for every promoted file" but
`knowledge/template.md` does not exist in the repo.

When running the librarian, the format must be inferred from existing promoted files (e.g.
`knowledge/testing/stub-vs-mock-domain.md`, `knowledge/testing/test-file-organization.md`).

The canonical format observed from existing files:
```
# <Title>

**Type:** Discovery | Problem | External

## Context
<when/where this applies>

## What is true / What happened
<facts or narrative>

## Do
- ...

## Don't
- ...

---

**Keywords:** comma-separated search terms
```

Either create `knowledge/template.md` with this format, or update SKILL.md to remove the
template reference and describe the format inline.
