# Pipeline design: group by file, not by phase

When a pipeline processes multiple files, split into per-file child pipelines.
Do NOT group by phase (all-refactor then all-test).

## Wrong (phase grouping)
```
parent
  phase 1: refactor useA, useB, useC
  phase 2: test useA, useB, useC
```

## Right (file grouping)
```
parent
  child: useA → review → refactor → commit → test → commit
  child: useB → review → refactor → commit → test → commit
  child: useC → review → refactor → commit → test → commit
```

## Why

Agent sessions accumulate context. A session that processes useA and then useB
carries useA's violations, diffs, and decisions as noise when working on useB.
Per-file child pipelines give each agent a clean session scoped to exactly one file.

Extra information is noise, not context.

## How

Parent pipeline: only `type: "child"` tasks, one per file.
Child pipeline: all phases for that one file (review → fix-loop → commit → test-loop → commit).
Name all agents with the file identifier as prefix (e.g. `arch-react-hooks-use-example-reviewer`).
