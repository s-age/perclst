# Hook-Injected Skills Cannot Be Called via Skill()

**Type:** Discovery

## Context

When running as a Claude agent (e.g. launched via `perclst start --procedure meta-librarian`),
the `available-skills` system reminder may list skills that look callable. Some of those skills
are **hook-injected** — delivered by a `PreToolUse` hook — not registered in the agent SDK.
The `Skill()` tool only knows about agent SDK skills.

## What happened / What is true

- Calling `Skill("meta-librarian")` inside a perclst sub-agent returns `"Unknown skill: meta-librarian"`
  even though `meta-librarian` appears in the `available-skills` reminder.
- Hook-based skills (e.g. `meta-librarian`, `meta-knowledge-capture`) are injected via
  `PreToolUse:Read hook additional context` when relevant file paths are accessed — they are not
  registered as agent SDK skills and cannot be invoked via `Skill()`.
- The injected content is fully usable; it arrives automatically when the agent reads a file
  whose path matches the hook's trigger pattern (e.g. any file under `knowledge/`).
- Agent SDK skills (e.g. `claude-api`, `review`) are registered in the harness and **can** be
  called via `Skill()`.

## Do

- Proceed without calling `Skill()` for hook-based skills — their instructions arrive automatically
  as `additionalContext` when the relevant files are read.
- Treat the injected `additionalContext` block as the authoritative instructions and execute
  them in-line.
- If unsure whether a skill is hook-based or SDK-registered, attempt a small file read in the
  relevant path first and check whether the instructions appear as hook context.

## Don't

- Don't assume every entry in `available-skills` is callable via `Skill()`.
- Don't retry `Skill()` calls when they fail with "Unknown skill" — the skill is hook-based and
  will never be reachable through that tool.
- Don't manually copy-paste skill instructions; let the hook inject them naturally.

---

**Keywords:** Skill tool, hook injection, PreToolUse, available-skills, agent SDK, headless, meta-librarian, additionalContext, hook-based skill, perclst sub-agent
