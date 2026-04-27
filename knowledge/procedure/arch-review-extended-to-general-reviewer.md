# arch/review Extended to General Code Reviewer

**Type:** Discovery

## Context

When adding security and performance review perspectives to the existing `arch/review` procedure,
the decision was made to extend the existing procedure file rather than create a new skill or
procedure. This applies whenever new review dimensions need to be added to the review agent.

## What happened / What is true

- `procedures/arch/review.md` was extended in-place to cover security and performance checks
  in addition to architecture review.
- A new `review` skill + procedure was deliberately **not** created.
- Architecture review and security/performance checks share the same goal: inspect one diff
  and report findings. Splitting into separate procedures would cause the diff to be fetched
  multiple times unnecessarily.
- The perclst design principle — "procedure defines What; skill defines How" — means the `arch`
  skill's layer rules remain referenced as-is; no duplication was introduced.
- Creating a separate skill would require new `/review` command wiring and produce dual
  maintenance overhead alongside `arch/review`.

## N+1 performance priority rationale

perclst is async TypeScript where I/O (file reads, process spawning, MCP tool calls) is the
bottleneck. Sequential `for..of + await` loops are the most common source of avoidable latency;
replacing them with `Promise.all` yields immediate gains. This is why N+1 detection was placed
first in the performance checklist.

## Do

- Extend an existing procedure file when the new review dimension shares the same diff/context
  as existing checks.
- Keep the `arch` skill's layer rules referenced from `arch/review` — do not duplicate them.

## Don't

- Don't create a new skill or procedure just to add a new review category if it reads the same
  diff as an existing reviewer.
- Don't split review procedures in a way that forces the agent to re-fetch the same diff.

---

**Keywords:** arch/review, procedure, code review, security, performance, N+1, extension, design decision
