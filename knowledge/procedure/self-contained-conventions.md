# Procedures Must Embed Their Own Conventions

**Type:** Problem

## Context

When a procedure delegates execution steps to agents, those agents only have access to the procedure's own text plus whatever tools and skills are explicitly loaded. If key conventions live exclusively in a skill file, agents that don't load that skill will lack authoritative answers and fall back to asking clarifying questions instead of acting.

## What happened / What is true

Agents running under `procedures/test-unit/implement.md` would stop and ask about test style (file placement, import style, assertion granularity) instead of writing tests. The `WriteTests` node referenced high-level guidance (framework, complexity order, coverage targets) but omitted concrete conventions already documented in `.claude/skills/unit-test-implementor/SKILL.md`. Without the skill loaded, agents had no authoritative source and stalled.

The fix was to embed the critical conventions directly into the `WriteTests` node:

- Test file path: `{dir}/__tests__/{stem}.test.ts`
- vitest explicit imports (`import { describe, it, expect, vi, beforeEach } from 'vitest'`)
- One assertion per `it` block
- Mock style: `vi.fn()` typed literals, `vi.mock()` for modules
- `beforeEach` instantiation for classes

## Do

- Duplicate every convention an agent needs directly into the procedure node that uses it
- Treat the procedure as the single authoritative source for agents running under it
- When pulling a convention from a skill, copy the rule verbatim into the procedure

## Don't

- Assume agents will load a skill referenced elsewhere — they won't unless explicitly told to
- Leave critical style rules only in a skill file that the procedure doesn't mandate loading
- Write procedure nodes that rely on external files without also embedding the essential rules

---

**Keywords:** procedure, conventions, self-contained, unit-test, skill, clarifying questions, WriteTests, vitest, test style
