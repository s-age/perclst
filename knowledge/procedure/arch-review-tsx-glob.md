# arch/review Procedure Misses .tsx Files

**Type:** Problem

## Context

The `arch/review` procedure's discovery step globs `target_path/**/*.ts`, which silently
excludes `.tsx` React component files. This affects any review of `src/cli/components/`,
which contains `.tsx` files such as `PipelineRunner/OutputPanel.tsx` and
`PipelineRunner/index.tsx`.

## What happened

Running `arch/review` against a directory that contains `.tsx` files results in those
files being skipped entirely. No violation is reported, and no import analysis is
performed for the omitted files. The agent has no indication that files were missed.

Workaround applied in pipeline review sessions: add an explicit note in each agent's
`task` field — "Note: this directory contains both .ts and .tsx files — review all
of them."

The proper fix is to update `procedures/arch/review.md` to glob `**/*.{ts,tsx}`.

## Do

- When running `arch/review` on directories that may contain `.tsx` files, explicitly
  instruct the agent to also review `.tsx` files in the task description.
- Update `procedures/arch/review.md` to use `**/*.{ts,tsx}` as the glob pattern.

## Don't

- Don't assume a `*.ts` glob covers all TypeScript source — `.tsx` files are excluded.
- Don't rely on the procedure to self-correct; the glob is hardcoded in the flowchart.

---

**Keywords:** arch-review, tsx, glob, react, components, procedure, discovery-step
