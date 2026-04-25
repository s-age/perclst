# Pipeline design: group by scope unit, not by phase

When a pipeline processes multiple targets, split into per-target child pipelines.
Do NOT group by phase (all-refactor then all-test across targets).

The grouping unit is whatever gives agents a clean, focused session:
- **Per file**: when each file is independently refactorable (e.g. 4 hook files)
- **Per layer**: when the target is a directory/layer (e.g. `src/core/di`, `src/validators`)

## Wrong (phase grouping across files)
```
parent
  phase 1: refactor useA, useB, useC
  phase 2: test useA, useB, useC
```

## Right (per-file child pipelines)
```
parent
  child: useA → review → refactor → commit → test → commit
  child: useB → review → refactor → commit → test → commit
  child: useC → review → refactor → commit → test → commit
```

## Why

Agent sessions accumulate context. A session that processes useA and then useB
carries useA's violations, diffs, and decisions as noise when working on useB.
Per-target child pipelines give each agent a clean session scoped to one target.

Extra information is noise, not context.

## How

Parent pipeline: only `type: "child"` tasks, one per target.
Child pipeline: all phases for that one target (review → fix-loop → commit → test-loop → commit).
Name all agents with the target identifier as prefix to avoid session collisions.
