# Separate Report Format into template.md

**Type:** Discovery

## Context

Applies when writing or maintaining procedure files (e.g. `procedures/arch/review.md`) that
include an output report format. Relevant whenever a procedure flowchart embeds format
specifications inline.

## What happened / What is true

Procedure flowcharts used to embed report format inline as escaped `\n` strings inside Mermaid
nodes — hard to read and hard to evolve. The `code-inspect` procedure already uses a cleaner
pattern: format lives in a standalone `template.md` beside the procedure file, and the flowchart
node simply says `"Format: procedures/<name>/template.md"`. The procedure stays focused on logic;
the template stays focused on output shape.

This pattern was adopted for `procedures/arch/review.md`.

## Do

- Place report format in a sibling `template.md` file alongside the procedure
- Reference the template from the flowchart: `"Format: procedures/<name>/template.md"`
- Keep flowchart nodes concise — logic only, no embedded format strings

## Don't

- Embed multi-line report format as escaped strings inside Mermaid nodes
- Mix output shape concerns into the procedure logic flowchart

---

**Keywords:** procedure, template, report format, arch review, flowchart, code-inspect, template.md, separation
