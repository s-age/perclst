# ts_get_references — Accidental Scope Narrowing Creates Silent Blind Spots

**Type:** Discovery

## Context

Applies when writing procedure instructions that use `ts_get_references` to check
for dead registrations or unused references. Relevant to any CHECK step that limits
which tokens to inspect.

## What happened / What is true

A CHECK 3 instruction scoped `ts_get_references` to "every token whose class lives
in the target path." This silently skipped dead registrations for tokens whose class
is defined outside the target path — the check appeared to pass while real issues
went undetected.

Scope limitations in tool-call instructions are a two-edged feature: intentional
narrowing reduces noise; accidental narrowing creates blind spots that look identical
to clean results. There is no warning when scope excludes relevant tokens.

## Do

- Make scope boundaries explicit and intentional in tool-call instructions
- State the reason for any scope limit (e.g., "limit to target path to reduce noise")
- Verify that omitted tokens are genuinely irrelevant, not just convenient to skip

## Don't

- Let scope boundaries default to "what's in the target path" without reviewing coverage
- Treat a passing check as complete if scope may have excluded relevant tokens
- Write scope constraints as incidental prose qualifiers — they change coverage silently

---

**Keywords:** ts_get_references, scope, blind spot, dead registration, target path, coverage, procedure, tool-call instructions, silent failure
