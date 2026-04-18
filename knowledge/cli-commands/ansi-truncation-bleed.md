# ANSI Escape Sequences Bleed When Truncated Mid-Sequence

**Type:** Problem

## Context

Applies whenever CLI output that may contain ANSI color/style codes is sliced at a
fixed character count — for example, truncating cell content in the `show` command's
tool-result table. Output from sub-agent calls (e.g. `perclst start` inside a Bash
tool) often carries embedded ANSI sequences from the agent's own display layer.

## What happened / What is true

`src/cli/commands/show.ts` truncated `tool_result` cell text by slicing at a fixed
character count. When a cell contained ANSI-formatted content (thoughts output from
a nested `perclst start` call), the slice landed inside an escape sequence. The
terminal consumed the partial sequence as an open style directive and applied it to
all subsequent rows, making the rest of the table render muted or with the wrong
color.

## Do

- Call `ansis.strip(text)` **before** any length-based slice or truncation.
- The `ansis` package is already a project dependency — no new import needed.

## Don't

- Don't truncate raw strings that may contain ANSI codes; always strip first.
- Don't assume that content sourced from external commands or sub-agents is plain
  text — it may carry escape sequences.

---

**Keywords:** ANSI, escape sequences, truncation, bleed, ansis, strip, show command, terminal color, tool_result
