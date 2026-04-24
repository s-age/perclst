---
name: meta-plan
description: Create a plan directory in plans/<slug>/ with interface definitions per layer. Use when planning a new feature or asked to write a plan.
paths:
  - 'plans/**'
---

Write all plan content in **English**.

The plan directory is consumed by two downstream agents — write for machine readability, not narrative prose.

## Before writing

1. Read `.claude/skills/arch/SKILL.md` — authoritative layer rules and import constraints.
2. Run `knowledge_search` for prior gotchas on the feature area.
3. Read `examples/chat-command/` in this skill for a complete structural reference.

## Output structure

```
plans/<slug>/
  brief.md      Goal + design decisions
  layers.md     Routing manifest for create-planning-pipeline
  <layer>.md    One file per touched layer — I/F definitions first
```

## brief.md

```markdown
# Goal
One paragraph: pain solved + what the feature does.

# Key Design Decisions
- Reuse candidates and why
- Error handling strategy
- Layer-rule exceptions with justification
- ID / type mapping decisions
```

## layers.md

Only include layers that actually change.
Order: `errors → types → infrastructures → repositories → domains → services → validators → cli`

```markdown
# Layer Manifest
plan: <slug>

| Order | Layer | Spec | Summary |
|-------|-------|------|---------|
| 1 | validators | validators.md | 1 new |
| 2 | cli | cli.md | 2 new, 1 modify |
```

## <layer>.md

**Lead with interface definitions. Code sketches follow.**

```markdown
# <Layer> Layer

## `src/<layer>/ports/foo.ts` (modify)
**Interface change**:
```ts
methodName(param: ParamType): ReturnType
```

## `src/<layer>/bar.ts` (new)
**Template**: `src/<layer>/existing.ts`
**Implements**: IFooInterface
```ts
export async function methodName(param: ParamType): Promise<ReturnType> {
  // skeleton
}
```

## `src/<layer>/index.ts` (modify)
**Change**: add import + wire up
```ts
// relevant snippet only
```
```

Rules:
- Every new file must name a **real existing** template
- Interface change entries must precede their implementations in the same file
- Code sketches must be valid TypeScript (not pseudocode)
- Verify imports comply with arch layer rules before writing

## Verify before finishing

- All rows in `layers.md` have a corresponding `<layer>.md` on disk
- Every interface definition has an implementation skeleton in the same file
- No forbidden cross-layer imports

See `examples/chat-command/` for a complete working example of all output files.
