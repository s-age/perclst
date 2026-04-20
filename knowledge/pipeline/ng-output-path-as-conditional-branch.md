# Use ng_output_path Existence as a Skip Signal

**Type:** Discovery

## Context

Pipelines have no native conditional-branch or skip mechanism. When an upstream
review step approves (finds no issues), downstream agents in the fix loop should
exit immediately without doing work. The presence or absence of the `ng_output_path`
file can serve as that conditional signal.

## What happened / What is true

- If the initial review finds no problems, it simply does not write an `ng_output_path`
  file (no rejection file is created).
- Both the `implement` agent and the `review-loop` agent include an explicit check in
  their task instructions: "if `ng_output_path` does not exist, exit immediately."
- File existence/absence therefore acts as a lightweight conditional branch inside
  a pipeline that otherwise has no skip primitive.

## Do

- Instruct each agent in the fix loop to check for `ng_output_path` at startup and
  exit early when the file is absent.
- Document this convention in the pipeline definition or task prompt so future
  maintainers understand the skip logic.

## Don't

- Don't assume a missing `ng_output_path` means an error — its absence is the
  *success* (approved) signal.
- Don't add branching logic elsewhere (e.g. in a wrapper script) when the
  file-existence check inside the agent task is sufficient.

---

**Keywords:** pipeline, skip, conditional branch, ng_output_path, file existence, implement, review loop, no-op, early exit
