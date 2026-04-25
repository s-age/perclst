# Pipeline Design: Group by Scope Unit, Not by Phase

**Type:** Discovery

## Context

Applies when a pipeline processes multiple independent targets (files, hooks,
layers). The structural choice is whether to batch all targets through each phase
together, or to give each target its own child pipeline.

## What happened / What is true

**Wrong (phase grouping across targets):**
```
parent
  phase 1: refactor useA, useB, useC
  phase 2: test useA, useB, useC
```

**Right (per-target child pipelines):**
```
parent
  child: useA → review → refactor → commit → test → commit
  child: useB → review → refactor → commit → test → commit
  child: useC → review → refactor → commit → test → commit
```

Agent sessions accumulate context. A session that processes useA and then useB
carries useA's violations, diffs, and decisions as noise when working on useB.
**Extra information is noise, not context.**

The grouping unit is whatever gives agents a clean, focused session:
- **Per file** — when each file is independently refactorable (e.g. 4 hook files)
- **Per layer** — when the target is a directory/layer (`src/core/di`, `src/validators`)

## Do

- Use a parent pipeline with only `type: "child"` tasks, one per target.
- Put all phases for one target inside that target's child pipeline.
- Prefix all agent names with the target identifier to avoid session collisions.

## Don't

- Don't group by phase across multiple targets in a single pipeline — agent
  sessions will accumulate irrelevant context from earlier targets.

---

**Keywords:** pipeline, child pipeline, scope, phase grouping, session context, per-file, per-layer, agent session, noise
